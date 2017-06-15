const amqp = require('amqplib');
const EventEmitter = require('events');

class Connection extends EventEmitter {
	constructor (opts){
		super();
		const {
			url = 'amqp://guest:guest@localhost:5672/',
			log,
			exchangeName,
			autoCreateExchange = true,
			autoReconnect = true,
			reconnectDelay = 1000
		} = opts || {};

		if (!log){
			throw new Error('need to define log');
		}

		if (!exchangeName){
			throw new Error('need to define exchangeName');
		}
		this.reconnectDelay = reconnectDelay;
		this.autoReconnect = autoReconnect;
		this.exchangeName = exchangeName;
		this.log = log;
		this.url = url;

		if (autoCreateExchange){
			this.createExchange();
		}

	}

	reconnect (){
		this.log.info('try to reconnect');
		this.connectionPromise = this.connection();
	}

	connection (){
		if (this.autoReconnect){
			this.on('close', this.reconnect);
		}
		return new Promise((resolve, reject) => {
			amqp.connect(this.url).then((connection) => {

				connection.on('close', () => {
					this.log.info('Connection close');
					this.emit('close');
				});
				connection.on('error', (err) => {
					this.log.error(err);
					this.emit('error', err);
				});
				this.log.info('Connected to '+this.url);
				return resolve(connection);
			})
			.catch((err) => {
				this.log.error(err);
				if (this.autoReconnect){
					return setTimeout(() => {
						return resolve(Promise.resolve(this.connection()));
					}, this.reconnectDelay);
				} else {
					return reject(err);
				}
			});
		});
	}

	getConnection (){
		if (this.connectionPromise){
			return this.connectionPromise;
		} else {
			this.log.info('Connection to '+this.url);
			this.connectionPromise = this.connection();
			return this.connectionPromise;
		}
	}

	getChannel () {
		return new Promise((resolve, reject) => {
			this.getConnection()
			.then((conn) => {
				conn.createChannel()
				.then((channel) => {
					return resolve(channel);
				});
			})
			.catch((err) => {
				return reject(err);
			});
		});
	}

	createExchange (){
		if (this.createExchangePromise){
			return this.createExchangePromise;
		} else {
			this.createExchangePromise = new Promise((resolve, reject) => {
				this.getChannel()
				.then((channel) => {
					this.log.info('Try to create exchange '+this.exchangeName);
					channel.assertExchange(this.exchangeName, 'topic', {
						durable: true,
						autoDelete: false
					})
					.then(() => {
						this.log.info('Successfuly create exchange '+this.exchangeName);
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
