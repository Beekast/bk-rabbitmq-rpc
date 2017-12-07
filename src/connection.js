const amqp = require('amqplib');
const EventEmitter = require('events');

class Connection extends EventEmitter {
	constructor (opts) {
		super();
		const {
			url = 'amqp://guest:guest@localhost:5672/',
			log,
			exchangeName,
			autoCreateExchange = true,
			reconnectDelay = 1000,
			name = 'connection'
		} =
			opts || {};

		if (!log) {
			throw new Error('need to define log');
		}

		if (!exchangeName) {
			throw new Error('need to define exchangeName');
		}
		this.reconnectDelay = reconnectDelay;
		this.exchangeName = exchangeName;
		this.log = log;
		this.url = url;
		this.name = name;

		this.replyQueue = 'amq.rabbitmq.reply-to';

		if (autoCreateExchange) {
			this.createExchange();
		}
	}

	_connection () {
		return new Promise((resolve, reject) => {
			amqp
				.connect(this.url)
				.then((connection) => {
					connection.on('close', () => {
						this.connectionPromise = null;
						this.log.info('Connection close');
						this.emit('close');
					});
					connection.on('error', (err) => {
						this.log.error(err);
						this.emit('error', err);
					});
					this.log.info('Connected to ' + this.url);
					return resolve(connection);
				})
				.catch((err) => {
					this.log.error(err);
					return setTimeout(() => {
						return resolve(Promise.resolve(this._connection()));
					}, this.reconnectDelay);
				});
		});
	}

	getConnection () {
		if (this.connectionPromise) {
			return this.connectionPromise;
		}

		this.log.info('Connection to ' + this.url);
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
						this.log.info('Try to create exchange ' + this.exchangeName);
						channel
							.assertExchange(this.exchangeName, 'topic', {
								durable: true,
								autoDelete: false
							})
							.then(() => {
								this.log.info('Successfuly create exchange ' + this.exchangeName);
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
