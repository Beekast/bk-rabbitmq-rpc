const bunyan = require('bunyan');
const streams = [];


module.exports = function (opts){
	const {
		level,
		name
	} = opts;
	streams.push({
		level,
		stream: process.stdout
	});
	return bunyan.createLogger({
		name,
		streams
	});
};
