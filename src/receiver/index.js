"use strict";

const owe = require("owe-core");
const expose = require("../expose");
const generating = require("../generatingMaps");

const pending = require("./pending");
const listeners = require("./listeners");

const connectorApis = new generating.WeakMap(api => api.route("connector"));

const receiver = {
	add(api, event, listener, once) {
		return pending.createAddRequest(api, event, listener, once)
			.then(entry => listeners.add(entry));
	},

	addListener(api, event, listener) {
		return this.add(api, event, listener, false);
	},

	once(api, event, listener) {
		return this.add(api, event, listener, true);
	},

	removeListener(api, event, listener) {
		return listeners.addCallDelayer(event, pending.createIdentificationRequest(api)
			.then(entry => listeners.remove(Object.assign({ event, listener }, entry)), () => false));
	},

	removeAllListeners(api, event) {
		return listeners.addCallDelayer(event, pending.createRemoveRequest(api, event)
			.then(entry => listeners.removeAll(entry), () => false));
	},

	listeners(api, event) {
		return pending.createIdentificationRequest(api)
			.then(entry => listeners.getListeners(Object.assign({ event }, entry)))
			.then(listeners => {
				if(!listeners)
					return [];

				return Array.from(listeners, listenerMeta => listenerMeta.listener);
			});
	},

	listenerCount(api, event) {
		return pending.createIdentificationRequest(api)
			.then(entry => listeners.getListeners(Object.assign({ event }, entry)))
			.then(listeners => listeners ? listeners.size : 0);
	}
};

const messageHandlers = {
	__proto__: null,

	confirmation(api, confirmation) {
		pending.handleRequestConfirmation(api, confirmation);
	},

	emit(api, data) {
		listeners.call({
			api,
			object: data.object,
			event: data.event
		}, data.args);
	},

	remove(api, data) {
		listeners.removeAll({
			api,
			object: data.object,
			event: data.event
		});
	}
};

owe(receiver, {
	closer(data) {
		if(!owe.client.isApi(this.origin.eventsApi))
			throw expose(new Error(`Events cannot be accessed via this protocol.`));

		if(!data || typeof data !== "object" || !(data.type in messageHandlers))
			throw expose(new TypeError("Invalid message."));

		return messageHandlers[data.type](connectorApis.get(this.origin.eventsApi), data);
	}
});

require("./clientFixer")(receiver);

module.exports = receiver;
