const uuidV4 = require('uuid/v4');

class Service {

	constructor (serviceName, opts, connection, log){
		const {
			autoCreateQueue = true,
			autoStartConsume = false,
			responseQueue = true,
			replyTimeout = 2000
		} = opts || {};

		this._handler = [];
		this._subscribtion = [];
		this.replyTimeout = replyTimeout;
		this.isConsumerStarted = false;
		this._log = log;

		if (!serviceName){
			throw new Error('you must provide a service name');
		}

		this.serviceName = serviceName;

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
		if (responseQueue){
			if (typeof responseQueue === 'boolean'){
				this.responseQueue = this.serviceName + '-responseQueue-'+uuidV4();
			} else {
				this.responseQueue = responseQueue;
			}
			this.createResponseQueue();
		}

		this.requestChannel = connection.getChannel();

	}

	createResponseQueue (){
		if (this.createResponseQueuePromise){
			return this.createResponseQueuePromise;
		} else {
			this.createResponseQueuePromise = this.connection.getChannel()
			.then((channel) => {
				return channel.assertQueue(this.responseQueue, {durable: false, exclusive: true, autoDelete: true})
				.then(({queue}) => {
					return channel.consume(queue, (message) => {
						const requestId = message.properties.correlationId;
						const {
							err,
							data
						} = JSON.parse(message.content.toString());
						if (requestId && this._subscribtion[requestId]){
							this._subscribtion[requestId](err, data);
						}
						channel.ack(message);
					});
				});
			});
			return this.createResponseQueuePromise;
		}
	}

	createQueue (){
		if (this.createQueuePromise){
			return this.createQueuePromise;
		} else {
			this.createQueuePromise = this.connection.getChannel()
			.then((channel) => {
				return channel.assertQueue(this.serviceName, {durable: true})
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
		this._log.debug('start to consume service'+this.serviceName);
		return this.connection.getChannel()
		.then((channel) => {
			return channel.consume(this.serviceName, (message) => {
				const requestId = message.properties.correlationId;
				const responseQueue = message.properties.replyTo;
				const method = message.properties.type;
				this._log.debug('received new message to consume');
				if (this._handler[method]){
					this._log.debug('find handler to consume');
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
						this._log.debug('Handler throw an error');
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
					this._log.debug('did\'nt find handler to consume :(');
					channel.nack(message);
				}
			});
		});
	}

	startConsume (){
		this.isConsumerStarted = true;
		if (this.consumePromise){
			return this.consumePromise;
		} else {
			this.consumePromise = this._consume();
			return this.consumePromise;
		}
	}

	request (method, data) {
		const requestId = uuidV4();

		const content = JSON.stringify(data);

		return new Promise((resolve, reject) => {

			const timeout = setTimeout( () => {
				delete this._subscribtion[requestId];
				return reject( new Error( 'No reply received within the configured timeout of ' + this.replyTimeout + ' ms' ) );
			}, this.replyTimeout );


			this._subscribtion[requestId] = (err, data) => {
				delete this._subscribtion[requestId];
				clearTimeout( timeout );
				if (err){
					return reject(new Error(err));
				}
				return resolve(data);
			};

			const bufferContent = new Buffer(content);

			Promise.all([
				this.createQueue(),
				this.createResponseQueue()
			])
			.then(() => {
				this.requestChannel
				.then((channel) => {
					channel.publish(
						this.connection.exchangeName,
						this.serviceName,
						bufferContent,
						{
							expiration: this.replyTimeout,
							correlationId: requestId,
							replyTo: this.responseQueue,
							type: method
						}
					);
				});
			})
			.catch((err) => {
				this._log.error(err);
				return reject(err);
			});
		});
	}
}

module.exports = Service;
