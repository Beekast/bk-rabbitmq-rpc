const Connection = require('./connection');
const Logger = require('./logger');
const Service = require('./service');

const uuid = require('uuid/v1');
class RabbitmqRPC {
	constructor (opts) {
		const {
			url = 'amqp://guest:guest@localhost:5672/',
			logLevel = 'info',
			logName = 'RabbitmqRPC',
			exchangeName = 'RabbitmqRPC',
			reconnectDelay = 1000,
			autoReconnect = true,
			timeout = 10000,
			replyTimeout,
			log
		} =
			opts || {};

		this._log =
			log ||
			Logger({
				level: logLevel,
				name: logName
			});
		if (replyTimeout) {
			this._log.warn('Deprecated replyTimeout option please use timeout instead');
			this._timeout = replyTimeout;
		}

		this._timeout = timeout;
		this._url = url;

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
		// this._requestChannel = this._connection.getChannel();
		this._requestChannel = this._connection.createRequestChannel();
	}

	_reconnect () {
		this._log.info('reconstruct request channel');
		this._requestChannel = this._connection.createRequestChannel();
	}

	request (serviceName, method, data, options) {
		const requestId = uuid();
		const content = JSON.stringify(data);
		let { timeout = this._timeout, replyTimeout } = options || {};
		if (replyTimeout && timeout === this._timeout) {
			this._log.warn('Deprecated replyTimeout option please use timeout instead');
			timeout = replyTimeout;
		}

		return new Promise((resolve, reject) => {
			Promise.all([this._connection.createExchange()])
				.then(() => {
					return this._requestChannel.then((channel) => {
						const bufferContent = new Buffer(content);
						channel.publish(this._connection.exchangeName, serviceName, bufferContent, {
							expiration: timeout,
							correlationId: requestId,
							replyTo: this._connection.replyQueue,
							type: method
						});

						const requestTimeout = setTimeout(() => {
							setImmediate(() => {
								const erreurMsg =
									'No reply received within the configured timeout of ' +
									timeout +
									' ms service : [' +
									serviceName +
									'] method : [' +
									method +
									']';
								channel.responseEmitter.emit(requestId, { err: erreurMsg });
							});
						}, timeout);

						channel.responseEmitter.once(requestId, ({ err, data }) => {
							clearTimeout(requestTimeout);
							if (err) {
								return reject(new Error(err));
							}
							return resolve(data);
						});
					});
				})
				.catch((err) => {
					this._log.error(err);
					return reject(err);
				});
		});
	}

	apply (serviceName, method, data, options) {
		const content = JSON.stringify(data);
		const { timeout } = options || {};

		return new Promise((resolve, reject) => {
			Promise.all([this._connection.createExchange()])
				.then(() => {
					return this._requestChannel.then((channel) => {
						const bufferContent = new Buffer(content);
						const messageOptions = {
							type: method
						};
						if (timeout) {
							messageOptions.expiration = timeout;
						}
						channel.publish(this._connection.exchangeName, serviceName, bufferContent, messageOptions);
						resolve();
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
