const uuidV4 = require('uuid/v4');
const Connection = require('./connection');
const Logger = require('./logger');
const Service = require('./service');

class RabbitmqRPC {

	constructor (opts){
		const {
			url = 'amqp://guest:guest@localhost:5672/',
			logLevel = 'info',
			logName = 'RabbitmqRPC',
			exchangeName = 'RabbitmqRPC',
			reconnectDelay = 1000,
			autoReconnect = true,
			responseQueuePrefix = 'default',
			replyTimeout = 2000,
			log
		} = opts || {};
		this.replyTimeout = replyTimeout;
		this._serviceQueuePromises = [];
		this._subscribtion = {};
		this._url = url;
		this._log = log || Logger({
			level: logLevel,
			name: logName
		});

		this._connection = new Connection({
			url,
			log: this._log,
			exchangeName,
			reconnectDelay,
			autoReconnect
		});

		this.responseQueue = responseQueuePrefix + '-responseQueue-' + uuidV4();
		this.createResponseQueue();
		this.requestChannel = this._connection.getChannel();
	}

	createResponseQueue () {
		if (!this.createResponseQueuePromise) {
			let connectionChannel;
			this.createResponseQueuePromise = this._connection.getChannel()
				.then((channel) => {
					connectionChannel = channel;
					return channel.assertQueue(this.responseQueue, {durable: false, exclusive: true, autoDelete: true});
				})
				.then(({queue}) => {
					connectionChannel.consume(queue, (message) => {
						const requestId = message.properties.correlationId;
						const {err, data} = JSON.parse(message.content.toString());
						if (requestId && this._subscribtion[requestId]) {
							this._subscribtion[requestId](err, data);
						}
						connectionChannel.ack(message);
					});
				});
		}
		return this.createResponseQueuePromise;
	}

	createQueue (serviceName) {
		if (!this._serviceQueuePromises[serviceName]) {
			let channel;
			this._serviceQueuePromises[serviceName] = this._connection.getChannel().then((_channel) => {
				channel = _channel;
				return channel.assertQueue(serviceName, {durable: true});
			}).then(({queue}) => {
				return channel.bindQueue(queue, this._connection.exchangeName, serviceName);
			}).then(() => channel.close);
		}
		return this._serviceQueuePromises[serviceName];
	}

	request (serviceName, commandName, data) {
		const requestId = uuidV4();
		let content;
		try {
			content = JSON.stringify(data || {});
		} catch (err) {
			return Promise.reject(err);
		}

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				delete this._subscribtion[requestId];
				return reject( new Error( 'No reply received within the configured timeout of ' + this.replyTimeout + ' ms' ) );
			}, this.replyTimeout);

			this._subscribtion[requestId] = (err, data) => {
				delete this._subscribtion[requestId];
				clearTimeout(timeout);
				if (err) {
					reject(new Error(err));
				} else {
					resolve(data);
				}
			};

			const bufferContent = new Buffer(content);

			Promise.all([
				this.createQueue(serviceName),
				this.createResponseQueue()
			]).then(() => this.requestChannel)
			.then((channel) => {
				channel.publish(this._connection.exchangeName, serviceName, bufferContent, {
					expiration: this.replyTimeout,
					correlationId: requestId,
					replyTo: this.responseQueue,
					type: commandName
				});
			}).catch((err) => {
				this._log.error(err);
				return reject(err);
			});
		});
	}

	createService (name, opts){
		return new Service(name, opts, this._connection, this._log);
	}
}


module.exports = RabbitmqRPC;
