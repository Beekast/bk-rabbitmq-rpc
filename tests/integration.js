const test = require('ava');

const RabbitmqRPC = require('../src');

const uuidV4 = require('uuid/v4');

let client;
test.before((t) => {
	try {
		const opts = {
			exchangeName: 'testBKRabbitRPC-' + uuidV4()
		};
		client = new RabbitmqRPC(opts);
		t.pass('ok');
	} catch (err) {
		t.fail(err);
	}
});

test('test integration with promise', async (t) => {
	try {
		const serviceName = 'serviceNamePromise' + uuidV4();
		const service = client.createService(serviceName, {
			autoStartConsume: false
		});
		service.handle('serviceMethodPromise', function (data) {
			return new Promise((resolve) => {
				return resolve(data.a + data.b);
			});
		});
		await service.startConsume();
		const result = await client.request(serviceName, 'serviceMethodPromise', { a: 1, b: 2 });
		if (result === 3) {
			t.pass();
		} else {
			t.fail('bad result');
		}
	} catch (err) {
		t.fail(err);
	}
});

test('test integration with async function', async (t) => {
	try {
		const serviceName = 'serviceNameAsync' + uuidV4();
		const service = client.createService(serviceName, {
			autoStartConsume: false
		});

		service.handle('serviceMethodAsync', async function (data) {
			return await data.a + data.b;
		});

		await service.startConsume();

		const result = await client.request(serviceName, 'serviceMethodAsync', { a: 1, b: 2 });
		if (result === 3) {
			t.pass();
		} else {
			t.fail('bad result');
		}
	} catch (err) {
		t.fail(err);
	}
});

test('test integration with classical function', async (t) => {
	try {
		const serviceName = 'serviceNameClassical' + uuidV4();
		const service = client.createService(serviceName, {
			autoStartConsume: false
		});

		service.handle('serviceMethodClassical', function (data) {
			return data.a + data.b;
		});

		await service.startConsume();

		const result = await client.request(serviceName, 'serviceMethodClassical', { a: 1, b: 2 });
		if (result === 3) {
			t.pass();
		} else {
			t.fail('bad result');
		}
	} catch (err) {
		t.fail(err);
	}
});

test('test integration with start consume function later', async (t) => {
	try {
		const serviceName = 'serviceNameConsumeLater' + uuidV4();
		const service = client.createService(serviceName, {
			autoStartConsume: false
		});

		service.handle('serviceMethodClassical', function (data) {
			return data.a + data.b;
		});

		await service.startConsume();

		const result = await client.request(serviceName, 'serviceMethodClassical', { a: 1, b: 2 });
		if (result === 3) {
			t.pass();
		} else {
			t.fail('bad result');
		}
	} catch (err) {
		t.fail(err);
	}
});

test('test integration with method find name', async (t) => {
	try {
		const serviceName = 'serviceNameConsumeLater' + uuidV4();
		const service = client.createService(serviceName, {
			autoStartConsume: false
		});

		service.handle('find', function (data) {
			return data.a + data.b;
		});

		await service.startConsume();

		const result = await client.request(serviceName, 'find', { a: 1, b: 2 });
		if (result === 3) {
			t.pass();
		} else {
			t.fail('bad result');
		}
	} catch (err) {
		t.fail(err);
	}
});

test('test integration with handler error throw', async (t) => {
	try {
		const serviceName = 'serviceNameThrow' + uuidV4();
		const service = client.createService(serviceName, {
			autoStartConsume: true
		});

		service.handle('serviceMethodThrow', function () {
			throw new Error('Error !!!!');
		});

		await t.throws(client.request(serviceName, 'serviceMethodThrow', { a: 1, b: 2 }));
	} catch (e) {
		t.fail(e);
	}
});

test('test integration with no-handler => timeout throw', async (t) => {
	try {
		const serviceName = 'serviceNameThrow2' + uuidV4();
		client.createService(serviceName, {
			autoStartConsume: true
		});

		await t.throws(client.request(serviceName, 'serviceMethodThrow2', { a: 1, b: 2 }));
	} catch (e) {
		t.fail(e);
	}
});
