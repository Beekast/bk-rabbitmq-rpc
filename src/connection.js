const amqp = require('amqplib');
const backoff = require('backoff');
const EventEmitter = require('events');

class Connection extends EventEmitter {
	constructor (opts, name) {
		super();
		const { url = 'amqp://guest:guest@localhost:5672/', log, exchangeName, autoCreateExchange = true } =
			opts || {};

		if (!log) {
			throw new Error('need to define log');
		}

		if (!exchangeName) {
			throw new Error('need to define exchangeName');
		}
		this.exchangeName = exchangeName;
		this.log = log;
		this.url = url;
		this.name = name || 'default';

		this.replyQueue = 'amq.rabbitmq.reply-to';

		if (autoCreateExchange) {
			this.createExchange();
		}
	}

	_connection () {
		return new Promise((resolve) => {
			let boff = backoff.exponential({
				randomisationFactor: 0.2,
				initialDelay: 1000,
				maxDelay: 8000
			});

			boff.on('backoff', (number, delay) => {
				this.log.info(`BK-RPC - Connection ${this.name} trial #${number} : waiting for ${delay} ms...'`);
				if (number === 10) {
					this.log.warn('BK-RPC - WARNING: 10 CONNECTION RETRIES');
				} else if (number === 100) {
					this.log.warn('BK-RPC - WARNING: 100 CONNECTION RETRIES');
				}
			});

			boff.on('ready', (number) => {
				this.log.info(`BK-RPC - Connection ${this.name} trial #${number}; connecting...`);
				amqp
					.connect(this.url, { noDelay: true })
					.then((connection) => {
						connection.on('close', () => {
							this.connectionPromise = null;
							this.log.info(`BK-RPC - Connection ${this.name} closed`);
							this.emit('close');
						});
						connection.on('error', (err) => {
							this.log.error(`BK-RPC - Connection ${this.name} error: ${err}`, err);
							this.emit('error', err);
						});
						this.log.info(`BK-RPC - Connection ${this.name} trial #${number}; connected to ${this.url}`);
						boff.reset();
						return resolve(connection);
					})
					.catch((err) => {
						this.log.error(`BK-RPC - Connection ${this.name} trial #${number}; failed: ${err}`, err);
						boff.backoff();
					});
			});

			boff.backoff();
		});
	}

	getConnection () {
		if (this.connectionPromise) {
			return this.connectionPromise;
		}

		this.log.info(`BK-RPC - Get connection ${this.name} to ${this.url}`);
		this.connectionPromise = this._connection();
		return this.connectionPromise;
	}

	newRequestChannel () {
		return new Promise((resolve, reject) => {
			this.newChannel()
				.then((channel) => {
					channel.responseEmitter = new EventEmitter();
					channel.responseEmitter.setMaxListeners(0);
					channel.consume(
						this.replyQueue,
						(msg) => {
							const content = JSON.parse(msg.content.toString());
							channel.responseEmitter.emit(msg.properties.correlationId, content);
						},
						{ noAck: true }
					);
					return resolve(channel);
				})
				.catch((err) => {
					return reject(err);
				});
		});
	}

	newChannel () {
		return new Promise((resolve, reject) => {
			this.getConnection()
				.then((conn) => {
					conn.createChannel().then((channel) => {
						return resolve(channel);
					});
				})
				.catch((err) => {
					return reject(err);
				});
		});
	}

	createExchange () {
		if (this.createExchangePromise) {
			return this.createExchangePromise;
		} else {
			this.createExchangePromise = new Promise((resolve, reject) => {
				this.newChannel()
					.then((channel) => {
						this.log.info('BK-RPC - Try to create exchange ' + this.exchangeName);
						channel
							.assertExchange(this.exchangeName, 'topic', {
								durable: true,
								autoDelete: false
							})
							.then(() => {
								this.log.info('BK-RPC - Successfuly create exchange ' + this.exchangeName);
								channel.close();
								return resolve();
							});
					})
					.catch((err) => {
						return reject(err);
					});
			});
			return this.createExchangePromise;
		}
	}
}

module.exports = Connection;
