const test = require('ava');
const bunyan = require('bunyan');

const Service = require('./service');
const Connection = require('./connection');


let connection;
test.before((t) => {
	try {
		connection = new Connection({
			exchangeName: 'testService',
			log: bunyan.createLogger({name: 'testService'})
		});
		t.pass('ok');
	} catch (err){
		t.fail(err);
	}
});

test('test instance with default args', (t) => {
	try {
		new Service('test', null, connection, connection.log);
		t.pass('ok');
	} catch (err){
		t.fail(err);
	}
});

test('test instance with custom responsequeue name', (t) => {
	try {
		new Service('test', {
			responseQueue: 'customresponseQueue'
		}, connection, connection.log);
		t.pass('ok');
	} catch (err){
		t.fail(err);
	}
});

test('test instance without responsequeue', (t) => {
	try {
		new Service('test', {
			responseQueue: false
		}, connection, connection.log);
		t.pass('ok');
	} catch (err){
		t.fail(err);
	}
});


test('test failed without service name', (t) => {
	try {
		new Service(null, {
			autoCreateQueue: false
		}, connection, connection.log);
		t.fail('have to failed without a service name');
	} catch (err){
		t.pass('ok');
	}
});

test('test failed without connection', (t) => {
	try {
		new Service('test', {
			autoCreateQueue: false
		}, null, connection.log);
		t.fail('have to failed without connection');
	} catch (err){
		t.pass('ok');
	}
});


test('test create queue', async (t) => {
	try {
		const service = new Service('newService', {
			autoCreateQueue: false
		}, connection, connection.log);
		await service.createQueue();
		await service.createQueue();
		t.pass('ok');
	} catch (err){
		t.fail(err);
	}
});


test('throw on redifined handler', (t) => {
	try {
		const service = new Service('newService', {
			autoCreateQueue: false
		}, connection, connection.log);
		service.handle('redifined', () => {
			return null;
		});
		t.throws(() => {
			service.handle('redifined', () => {
				return null;
			});
		});
		t.pass('ok');
	} catch (err){
		t.fail(err);
	}
});
