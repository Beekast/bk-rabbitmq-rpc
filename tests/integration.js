const test = require('ava');

const RabbitmqRPC = require('../src');

const uuidV4 = require('uuid/v4');


let client;
test.before((t) => {
	try {
		const opts = {
			exchangeName: 'testBKRabbitRPC-'+uuidV4()
		};
		client = new RabbitmqRPC(opts);
		t.pass('ok');
	} catch (err){
		t.fail(err);
	}
});


test('test integration with promise', async (t) => {
	try {
		const service = client.createService('serviceNamePromise', {
			autoStartConsume: true
		});
		service.handle('serviceMethodPromise', function (data){
			return new Promise((resolve) => {
				return resolve(data.a + data.b);
			});
		});
		const result = await client.request('serviceNamePromise', 'serviceMethodPromise', {a: 1, b: 2});
		if (result === 3){
			t.pass();
		} else {
			t.fail('bad result');
		}

	} catch (err){
		t.fail(err);
	}
});


test('test integration with async function', async (t) => {
	try {
		const service = client.createService('serviceNameAsync', {
			autoStartConsume: true
		});

		service.handle('serviceMethodAsync', async function (data){
			return await data.a + data.b;
		});

		const result = await client.request('serviceNameAsync', 'serviceMethodAsync', {a: 1, b: 2});
		if (result === 3){
			t.pass();
		} else {
			t.fail('bad result');
		}

	} catch (err){
		t.fail(err);
	}
});

test('test integration with classical function', async (t) => {
	try {
		const service = client.createService('serviceNameClassical', {
			autoStartConsume: true
		});

		service.handle('serviceMethodClassical', function (data){
			return data.a + data.b;
		});

		const result = await client.request('serviceNameClassical', 'serviceMethodClassical', {a: 1, b: 2});
		if (result === 3){
			t.pass();
		} else {
			t.fail('bad result');
		}

	} catch (err){
		t.fail(err);
	}
});

test('test integration with handler error throw', async (t) => {
	try {
		const service = client.createService('serviceNameThrow', {
			autoStartConsume: true
		});

		service.handle('serviceMethodThrow', function (){
			throw new Error('Error !!!!');
		});

		await t.throws(client.request('serviceNameThrow', 'serviceMethodThrow', {a: 1, b: 2}));

	} catch (e) {
		t.fail(e);
	}

});


test('test integration with no-handler => timeout throw', async (t) => {
	try {
		client.createService('serviceNameThrow2', {
			autoStartConsume: true
		});


		await t.throws(client.request('serviceNameThrow2', 'serviceMethodThrow2', {a: 1, b: 2}));

	} catch (e) {
		t.fail(e);
	}

});
