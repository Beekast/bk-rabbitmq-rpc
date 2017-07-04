# bk-rabbitmq-rpc

This is a very opinionated abstraction over amqplib to help simplify the implementation of RPC messaging patterns on RabbitMQ.

> !IMPORTANT! - bk-rabbitmq-rpc needs nodejs >= 8.x.

### Features:
 * Creation of RPC services (client & server)
 * Attempt to gracefully handle lost connections and channels

## Installation

```(bash)
npm install bk-rabbitmq-rpc
```

## Getting started

On RPC server :

```javascript
const RabbitmqRPC = require('bk-rabbitmq-rpc');

const client = new RabbitmqRPC();

// create a your first service
const service = client.createService('myFirstService',{ autoStartConsume: true })

// or if you don't use option autoStartConsume for rpc server
service.startConsume();

// handle a service method on rpc server
service.handle('myMethod', function(data){
	return data;
});
```
On RPC Client :
```javascript
const RabbitmqRPC = require('bk-rabbitmq-rpc');

const client = new RabbitmqRPC();

// on rpc client ask the service method
client.request('myFirstService','myMethod',data).then((result) => {
	console.log(result);
})

```

## API Reference

### new RabbitmqRPC(options)
Return a new RabbitmqRPC client.
`options` are :
 * 	`url` : URL to connect to RabbitMQ (default : `amqp://guest:guest@localhost:5672/`)
 * `logLevel` : Log level (default : `info`)
 * `logName` : Log name for Bunyan = (default : `RabbitmqRPC`)
 * `exchangeName` : Exchange name for handle RPC request  (default : `RabbitmqRPC`)
 * `log` : Custom log instance (require to implement function trace, debug, info, warn and error)
 * `reconnectDelay` : Delay in ms before reconnect on connection close (default `1000`)
 * `autoReconnect` : Enable autoReconnect option (default `true`)
 * `responseQueue` : If `true`, the responseQueue will be generated, it's possible to use a string to define. Use `false` for no responseQueue (default : `true`)
* `replyTimeout` : Timeout for rpc request in ms (default : `2000`)

### {client} request(serviceName, method,data)
Request a method on a service.
`serviceName` string for the service name.
`method` is the method name, you have to use alphanum string for the method name.
`data` is the data send to the client.

This function return a Promise.

### {client} createService(serviceName, options)
Return a service object
`serviceName` string for the service name.
`options` are :
* `autoStartConsume` : If the service start to consume RPC message at the beginning (default : `false`)

### {service} handle(method,function(data) {})
Handle a method for the service.
`method` is the method name, you have to use alphanum string for the method name.
`function` is the function called. It can be a function or a promise. The return of the function is return to the client. The function take one arg whose is the data send by the client.

> !IMPORTANT! - if you don't use the option autoStartConsume: true on service constructor don't forget to call service.startConsume() to handle the RabbitmqRPC message.

## Contributing

First off, thanks for your interest and for wanting to contribute!
PRs with insufficient coverage, broken tests or deviation from the style will not be accepted.

### Run tests

```bash
# With docker
npm run build-image #to build rabbitmq Image
npm run start-image #to start rabbitmq on localhost
# Or provide your own local rabbitmq install

# run tests
npm test

# run lint
npm run lint

# run coverage
npm run coverage
```

### TODO
 * Add better coverage test
 * Add better reconnection method => sometime the connections aren't really closed
 * ...

## License
MIT License

Copyright (c) 2017 Beekast
