class Service {
	constructor (serviceName, opts, connection, log) {
		const { autoCreateQueue = true, autoStartConsume = false, limit = false } = opts || {};

		this._handler = {};
		this.isConsumerStarted = false;
		this._log = log;
		this.limit = limit;

		if (!serviceName) {
			throw new Error('you must provide a service name');
		}
		this.serviceName = serviceName;
		this.serviceQueueName = connection.exchangeName + '.' + serviceName;
		this._connection = connection;
		this._connection.on('close', () => {
			this._reconnect();
		});

		// Create queue for service
		if (autoCreateQueue) {
			this.createQueue().then(() => {
				if (autoStartConsume) {
					this.startConsume();
				}
			});
		}

		if (autoStartConsume) {
			this.startConsume();
		}

		this.responseChannel = this._connection.newChannel();
	}

	createQueue () {
		if (this.createQueuePromise) {
			return this.createQueuePromise;
		} else {
			this.createQueuePromise = this._connection.newChannel().then((channel) => {
				return channel.assertQueue(this.serviceQueueName, { durable: true }).then(({ queue }) => {
					return channel.bindQueue(queue, this._connection.exchangeName, this.serviceName).then(() => {
						channel.close();
					});
				});
			});
			return this.createQueuePromise;
		}
	}

	handle (method, callback) {
		if (this._handler[method]) {
			throw new Error('handler already define');
		}
		this._handler[method] = callback;
	}

	_reconnect () {
		this._log.info('reconnect reponse channel');
		this.responseChannel = this._connection.newChannel();
		this._log.info('reconnect consume service');
		this._consumePromise = null;
		if (this.isConsumerStarted) {
			this.startConsume();
		}
	}

	_consume () {
		this._log.debug('start to consume service ' + this.serviceName);
		const self = this;
		return this._connection.newChannel().then((channel) => {
			return channel.prefetch(this.limit).then(() => {
				return channel.consume(
					this.serviceQueueName,
					(message) => {
						this._log.debug(message.properties);
						const requestId = message.properties.correlationId;
						const responseQueue = message.properties.replyTo;
						const method = message.properties.type;
						this._log.debug('received new message to consume for service ' + self.serviceName);
						if (this._handler[method]) {
							this._log.debug(
								'find handler to consume for service ' + self.serviceName + ' and method ' + method
							);
							const data = JSON.parse(message.content.toString());
							let handler;
							try {
								handler = Promise.resolve(this._handler[method](data));
							} catch (err) {
								handler = Promise.reject(err);
							}

							let encodedresult;

							handler
								.then((result) => {
									this._log.debug(
										'Handler return a result for service ' +
											self.serviceName +
											' and method ' +
											method
									);
									encodedresult = new Buffer(
										JSON.stringify({
											err: null,
											data: result
										})
									);
								})
								.catch((err) => {
									this._log.debug(
										'Handler throw an error for service ' +
											self.serviceName +
											' and method ' +
											method
									);
									encodedresult = new Buffer(
										JSON.stringify({
											err: err.message,
											data: null
										})
									);
								})
								.then(() => {
									if (responseQueue) {
										this.responseChannel.then((channel) => {
											channel.publish('', responseQueue, encodedresult, {
												correlationId: requestId
											});
										});
									}
									channel.ack(message);
								});
						} else {
							this._log.debug(
								"did'nt find handler " + method + ' to consume :( for service ' + self.serviceName
							);
							channel.nack(message);
						}
					},
					{ noAck: false }
				);
			});
		});
	}

	startConsume () {
		this.isConsumerStarted = true;
		const self = this;
		if (this._consumePromise) {
			return this._consumePromise;
		} else {
			this._consumePromise = this.createQueue().then(() => {
				return self._consume();
			});
			return this._consumePromise;
		}
	}
}

module.exports = Service;
