"use strict";

const owe = require("owe-core");
const expose = require("../expose");
const generating = require("../generatingMaps");

const EventEmitter = require("./EventEmitter");

const receiverApis = new generating.WeakMap(api => api.route("receiver"));

const connector = {
	__proto__: null,

	addListener(api, object, data) {
		api = receiverApis.get(api);

		const eventEmitter = EventEmitter.forObject(object);

		eventEmitter.addListener(data.event, api);

		api.close({
			type: "confirmation",
			id: data.id,
			token: data.token,
			object: eventEmitter.id
		});
	},

	removeListener(api, object, data) {
		const eventEmitter = EventEmitter.lookupObject(object);

		if(!eventEmitter)
			throw expose(new Error("This EventEmitter does not have any listeners yet."));

		api = receiverApis.get(api);
		eventEmitter.removeListener(data.event, api);

		api.close({
			type: "confirmation",
			id: data.id,
			token: data.token,
			object: eventEmitter.id
		});
	},

	// The listeners keyword is misused to identify event emitters instead of returning their listeners.
	// This guarantees that the event router route names are a strict subset of EventEmitter instance method names.
	listeners(api, object, data) {
		const eventEmitter = EventEmitter.lookupObject(object);

		if(!eventEmitter)
			throw expose(new Error("This EventEmitter does not have any listeners yet."));

		receiverApis.get(api).close({
			type: "confirmation",
			id: data.id,
			token: data.token,
			object: eventEmitter.id
		});
	}
};

const messageHandlers = {
	__proto__: null,

	remove(api, data) {
		return EventEmitter.lookupId(data.object).removeListener(data.event, receiverApis.get(api));
	}
};

owe(connector, {
	router(object) {
		const emitter = EventEmitter.lookupId(object);

		if(!emitter)
			throw new Error("Invalid object id.");

		return emitter.object;
	},

	closer(data) {
		if(!owe.client.isApi(this.origin.eventsApi))
			throw expose(new Error("Events cannot be accessed via this protocol."));

		if(!data || typeof data !== "object" || !(data.type in messageHandlers))
			throw expose(new TypeError("Invalid message."));

		return messageHandlers[data.type](this.origin.eventsApi, data);
	}
});

module.exports = connector;
