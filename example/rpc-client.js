#!/usr/bin/env node

const RabbitmqRPC = require('../src');

const client = new RabbitmqRPC();


async function sum (a, b){
	let result;
	try {
		result = await client.request('my.service.rpc', 'sum', {a, b});
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
