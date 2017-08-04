const Connection = require('./connection');
const Logger = require('./logger');
const Service = require('./service');

const uuidV4 = require('uuid/v4');

class RabbitmqRPC {
	constructor (opts) {
		const {
			url = 'amqp://guest:guest@localhost:5672/',
			logLevel = 'info',
			logName = 'RabbitmqRPC',
			exchangeName = 'RabbitmqRPC',
			responseQueue = true,
			reconnectDelay = 1000,
			autoReconnect = true,
			replyTimeout = 2000,
			log
		} =
			opts || {};

		this._replyTimeout = replyTimeout;
		this._url = url;
		this._log =
			log ||
			Logger({
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

		// autoReconnect exchange;
		if (this._connection.autoReconnect) {
			// on channel close restart consumer and responseQueue
			this._connection.on('close', () => {
				this._reconnect();
			});
		}

		this._requests = [];
		if (responseQueue) {
			if (typeof responseQueue === 'boolean') {
				this._responseQueue = this.exchangeName + '-responseQueue-' + uuidV4();
			} else {
				this._responseQueue = responseQueue;
			}
			this.createResponseQueue();
		}
		this._requestChannel = this._connection.getChannel();
	}

	_reconnect () {
		return setTimeout(() => {
			this._log.info('reconnect service');
			this._requestChannel = this._connection.getChannel();
			if (this._responseQueue) {
				this.createResponseQueue();
			}
		}, this._connection.reconnectDelay);
	}

	createResponseQueue () {
		if (this.createResponseQueuePromise) {
			return this.createResponseQueuePromise;
		} else {
			if (this._responseQueue) {
				// force to have a responseQueue name in case of request without responseQueue
				this._responseQueue = this._connection.exchangeName + '-responseQueue-' + uuidV4();
			}

			this.createResponseQueuePromise = this._connection.getChannel().then((channel) => {
				return channel
					.assertQueue(this._responseQueue, { durable: false, exclusive: true, autoDelete: true })
					.then(({ queue }) => {
						return channel.consume(queue, (message) => {
							const requestId = message.properties.correlationId;
							const { err, data } = JSON.parse(message.content.toString());
							if (requestId && this._requests[requestId]) {
								this._requests[requestId](err, data);
							}
							channel.ack(message);
						});
					});
			});
			return this.createResponseQueuePromise;
		}
	}

	request (serviceName, method, data, options) {
		const requestId = uuidV4();

		const content = JSON.stringify(data);

		const { replyTimeout = this._replyTimeout } = options || {};

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				delete this._requests[requestId];
				return reject(
					new Error(
						'No reply received within the configured timeout of ' +
							replyTimeout +
							' ms service : [' +
							serviceName +
							'] method : [' +
							method +
							']'
					)
				);
			}, replyTimeout);

			this._requests[requestId] = (err, data) => {
				delete this._requests[requestId];
				clearTimeout(timeout);
				if (err) {
					return reject(new Error(err));
				}
				return resolve(data);
			};

			const bufferContent = new Buffer(content);

			Promise.all([this._connection.createExchange(), this.createResponseQueue()])
				.then(() => {
					this._requestChannel.then((channel) => {
						channel.publish(this._connection.exchangeName, serviceName, bufferContent, {
							expiration: replyTimeout,
							correlationId: requestId,
							replyTo: this._responseQueue,
							type: method
						});
					});
				})
				.catch((err) => {
					this._log.error(err);
					return reject(err);
				});
		});
	}

	createService (name, opts) {
		return new Service(name, opts, this._connection, this._log);
	}
}

module.exports = RabbitmqRPC;
