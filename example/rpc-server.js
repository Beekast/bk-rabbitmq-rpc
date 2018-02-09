#!/usr/bin/env node

const RabbitmqRPC = require('../src');

const client = new RabbitmqRPC();

const service = client.createService('my.service.rpc', {
	autoStartConsume: true,
	limit: 1000
});

function sum (a, b){
	return new Promise((resolve) => {
		setTimeout(() => {
			return resolve(a+b);
		}, 70000);
		// resolve(a+b);
	});
}

service.handle('sum', async ({a, b}) => {
	const start = Date.now();
	const result = await sum(a, b);
	const ms = Date.now() - start;
	console.log(`${a} ${b} - ${ms} ms`);
	return result;
});

setTimeout(() => {


}, 10000000);
