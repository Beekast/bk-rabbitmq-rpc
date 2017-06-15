#!/usr/bin/env node

const RabbitmqRPC = require('../src');

const client = new RabbitmqRPC();

const service = client.createService('my.service.rpc');


async function sum (a, b){
	let result;
	try {
		result = await service.request('sum', {a, b});
	} catch (err){
		console.log(err);
	}
	return result;
}

async function run (){
	for (let i = 0; i < 100000; i++){
		const result = await sum(i, i)
		console.log('sum '+i+'+'+i+'='+result);
	}

}

run();
