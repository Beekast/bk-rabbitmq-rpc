const test = require('ava');

const Connection = require('./connection');
const bunyan = require('bunyan');
// test instance with default args
test((t) => {
	try {
		const conn = new Connection({
			log: bunyan.createLogger({name: 'testConnection'}),
			exchangeName: 'RabbitmqRPC'
		});
		if (conn.url === 'amqp://guest:guest@localhost:5672/'){
			t.pass('ok');
		} else {
			t.fail('bad rabbitmq URL');
		}
	} catch (err){
		t.fail(err);
	}
});

// throw without logger
test((t) => {
	t.throws(() => {
		new Connection();
	});
});

// throw without exchangeName
test((t) => {
	const opts = {
		log: bunyan.createLogger({name: 'testConnection'})
	};
	t.throws(() => {
		new Connection(opts);
	});
});

// test instance with custom args
test((t) => {
	try {
		const opts = {
			url: 'amqp://guest:guest@127.0.0.1:5672/',
			log: bunyan.createLogger({name: 'newTest'}),
			exchangeName: 'RabbitmqRPC'
		};
		const conn = new Connection(opts);
		if (conn.url === opts.url){
			t.pass('ok');
		} else {
			t.fail('bad rabbitmq URL');
		}
	} catch (err){
		t.fail(err);
	}
});


// test connection
test(async (t) => {
	try {
		const opts = {
			log: bunyan.createLogger({name: 'testConnection'}),
			exchangeName: 'RabbitmqRPC'
		};
		const conn = new Connection(opts);
		await conn.getConnection();
		// test twice to control not open a new connection
		await conn.getConnection();
		t.pass();
	} catch (err){
		t.fail(err);
	}
});

// test failed connection with bad params
test(async (t) => {
	try {
		const opts = {
			log: bunyan.createLogger({name: 'testConnection'}),
			exchangeName: 'RabbitmqRPC',
			url: 'amqp://guest:guest@RabbitmqRPC:5672/',
			autoCreateExchange: false,
			autoReconnect: false
		};
		const conn = new Connection(opts);

		await t.throws(conn.getConnection());

		t.pass();
	} catch (err){
		t.fail(err);
	}
});

// test failed getChannel with bad params
test(async (t) => {
	try {
		const opts = {
			log: bunyan.createLogger({name: 'testConnection'}),
			exchangeName: 'RabbitmqRPC',
			url: 'amqp://guest:guest@RabbitmqRPC:5672/',
			autoCreateExchange: false,
			autoReconnect: false
		};
		const conn = new Connection(opts);

		await t.throws(conn.getChannel());

		t.pass();
	} catch (err){
		t.fail(err);
	}
});

// test createExchange
test(async (t) => {
	try {
		const opts = {
			log: bunyan.createLogger({name: 'testConnection'}),
			exchangeName: 'RabbitmqRPC',
			autoCreateExchange: false
		};
		const conn = new Connection(opts);
		await conn.createExchange();
		// test twice to control not create type twice
		await conn.createExchange();
		t.pass();
	} catch (err){
		t.fail(err);
	}
});


// test failed createExchange with bad params
// test failed getChannel with bad params
test(async (t) => {
	try {
		const opts = {
			log: bunyan.createLogger({name: 'testConnection'}),
			exchangeName: 'RabbitmqRPC',
			url: 'amqp://guest:guest@RabbitmqRPC:5672/',
			autoCreateExchange: false,
			autoReconnect: false
		};
		const conn = new Connection(opts);

		await t.throws(conn.createExchange());

		t.pass();
	} catch (err){
		t.fail(err);
	}
});
