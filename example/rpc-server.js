#!/usr/bin/env node

const RabbitmqRPC = require('../src');

const client = new RabbitmqRPC();

const service = client.createService('my.service.rpc', {
	autoStartConsume: true,
	responseQueue: false
});

service.handle('sum', ({a, b}) => {
	console.log('handle sum ',a,b);
	return a + b;
});

setTimeout(() => {


}, 10000000);
