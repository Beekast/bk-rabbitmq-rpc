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
			log
		} = opts || {};

		this._url = url;
		this._log = log || Logger({
			level: logLevel,
			name: logName
		});

		this._connection = new Connection({
			url,
			log: this._log,
			exchangeName
		});
	}

	createService (name, opts){
		return new Service(name, opts, this._connection, this._log);
	}
}


module.exports = RabbitmqRPC;
