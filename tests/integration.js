const test = require('ava');

const RabbitmqRPC = require('../src');


test('test integration with promise', async (t) => {
	try {
		const client = new RabbitmqRPC();

		const service = client.createService('serviceNamePromise', {
			autoStartConsume: true
		});
		service.handle('serviceMethodPromise', function (data){
			return new Promise((resolve) => {
				return resolve(data.a + data.b);
			});
		});
		const result = await service.request('serviceMethodPromise', {a: 1, b: 2});
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
		const client = new RabbitmqRPC();

		const service = client.createService('serviceNameAsync', {
			autoStartConsume: true
		});

		service.handle('serviceMethodAsync', async function (data){
			return await data.a + data.b;
		});

		const result = await service.request('serviceMethodAsync', {a: 1, b: 2});
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
		const client = new RabbitmqRPC();

		const service = client.createService('serviceNameClassical', {
			autoStartConsume: true
		});

		service.handle('serviceMethodClassical', function (data){
			return data.a + data.b;
		});

		const result = await service.request('serviceMethodClassical', {a: 1, b: 2});
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
		const client = new RabbitmqRPC();

		const service = client.createService('serviceNameThrow', {
			autoStartConsume: true
		});

		service.handle('serviceMethodThrow', function (){
			throw new Error('Error !!!!');
		});

		await t.throws(service.request('serviceMethodThrow', {a: 1, b: 2}));

	} catch (e) {
		t.fail(e);
	}

});


test('test integration with no-handler => timeout throw', async (t) => {
	try {
		const client = new RabbitmqRPC();

		const service = client.createService('serviceNameThrow2', {
			autoStartConsume: true
		});


		await t.throws(service.request('serviceMethodThrow2', {a: 1, b: 2}));

	} catch (e) {
		t.fail(e);
	}

});
