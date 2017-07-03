const test = require('ava');

const RabbitmqRPC = require('./index');

const bunyan = require('bunyan');

test('test instance with default args', (t) => {
	try {
		const client = new RabbitmqRPC();
		if (client._url === 'amqp://guest:guest@localhost:5672/'){
			t.pass('ok');
		} else {
			t.fail('bad rabbitmq URL');
		}
	} catch (err){
		t.fail(err);
	}
});


test('test instance with custom args', (t) => {
	try {
		const opts = {
			url: 'amqp://guest:guest@127.0.0.1:5672/',
			log: bunyan.createLogger({name: 'newTest'})
		};
		const client = new RabbitmqRPC(opts);
		if (client._url === opts.url){
			t.pass('ok');
		} else {
			t.fail('bad rabbitmq URL');
		}
	} catch (err){
		t.fail(err);
	}
});

test('test create Service', (t) => {
	try {
		const client = new RabbitmqRPC();
		client.createService('testService');
	} catch (err){
		t.fail(err);
	}
});

test('test failed create Service without name', (t) => {
	try {
		const client = new RabbitmqRPC();
		t.throws(() => {
			client.createService();
		});
	} catch (err){
		t.fail(err);
	}
});

test('test createResponseQueue returned type', (t) => {
	const client = new RabbitmqRPC();
	const responseQueue = client.createResponseQueue();
	if (responseQueue instanceof Promise) {
		t.pass();
	} else {
		t.fail();
	}
	return responseQueue;
});

test('test createResponseQueue should not throw error', () => {
	const client = new RabbitmqRPC();
	return client.createResponseQueue();
});
