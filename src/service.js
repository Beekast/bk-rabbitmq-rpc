class Service {

	constructor (serviceName, opts, connection, log){
		const {
			autoCreateQueue = true,
			autoStartConsume = false
		} = opts || {};

		this._handler = [];
		this.isConsumerStarted = false;
		this._log = log;

		if (!serviceName){
			throw new Error('you must provide a service name');
		}

		this.serviceName = serviceName;
		this.serviceQueueName = connection.exchangeName +'.'+serviceName;

		if (!connection){
			throw new Error('no connection provide');
		}

		this.connection = connection;

		// autoReconnect exchange;
		if (this.connection.autoReconnect){
			// on channel close restart consumer and responseQueue
			this.connection.on('close', () => {
				this.reconnect();
			});
		}


		// Create queue for service
		if (autoCreateQueue){
			this.createQueue()
			.then(() => {
				if (autoStartConsume){
					this.startConsume();
				}
			});
		}

		// Create responsequeue for service


		this.requestChannel = connection.getChannel();

	}

	createQueue (){
		if (this.createQueuePromise){
			return this.createQueuePromise;
		} else {
			this.createQueuePromise = this.connection.getChannel()
			.then((channel) => {
				return channel.assertQueue(this.serviceQueueName, {durable: true})
				.then(({queue}) => {
					return channel.bindQueue(queue, this.connection.exchangeName, this.serviceName)
					.then(() => {
						channel.close();
					});
				});
			});
			return this.createQueuePromise;
		}
	}

	handle (method, callback){
		if (this._handler[method]){
			throw new Error('handler already define');
		}
		this._handler[method] = callback;
	}

	reconnect (){
		return setTimeout(() => {
			this._log.info('reconnect service');
			this.requestChannel = this.connection.getChannel();
			if (this.isConsumerStarted){
				this.consumePromise = this._consume();
			}

			if (this.responseQueue) {
				this.createResponseQueuePromise = null;
				this.createResponseQueue();
			}
		}, this.connection.reconnectDelay);
	}


	_consume (){
		this._log.debug('start to consume service '+this.serviceName);
		const self = this;
		return this.connection.getChannel()
		.then((channel) => {
			return channel.consume(this.serviceQueueName, (message) => {
				const requestId = message.properties.correlationId;
				const responseQueue = message.properties.replyTo;
				const method = message.properties.type;
				this._log.debug('received new message to consume for service '+self.serviceName);
				if (this._handler[method]){
					this._log.debug('find handler to consume for service '+self.serviceName+' and method '+method);
					const data = JSON.parse(message.content.toString());
					let handler;
					try {
						handler = Promise.resolve(this._handler[method](data));
					} catch (err){
						handler = Promise.reject(err);
					}
					handler
					.then((result) => {
						this._log.debug('Handler return a result');
						const encodedresult = new Buffer(JSON.stringify({
							err: null,
							data: result
						}));
						channel.sendToQueue(
							responseQueue,
							encodedresult,
							{
								correlationId: requestId
							}
						);
					})
					.catch((err) => {
						this._log.debug('Handler throw an error for service '+self.serviceName+' and method '+method);
						const encodedresult = new Buffer(JSON.stringify({
							err: err.message,
							data: null
						}));
						channel.sendToQueue(
							responseQueue,
							encodedresult,
							{
								correlationId: requestId
							}
						);
					});
					channel.ack(message);
				} else {
					this._log.debug('did\'nt find handler to consume :( for service '+self.serviceName);
					channel.nack(message);
				}
			});
		});
	}

	startConsume (){
		this.isConsumerStarted = true;
		const self = this;
		if (this.consumePromise){
			return this.consumePromise;
		} else {
			this.consumePromise = this.createQueue()
			.then(() => {
				return self._consume();
			});
			return this.consumePromise;
		}
	}
}

module.exports = Service;
