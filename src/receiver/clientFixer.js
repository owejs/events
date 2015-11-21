"use strict";

const ClientApi = require("owe-core/src/ClientApi");

module.exports = receiver => {
	Object.assign(ClientApi.prototype, {
		addListener(event, listener) {
			return receiver.addListener(this, event, listener);
		},

		once(event, listener) {
			return receiver.once(this, event, listener);
		},

		removeListener(event, listener) {
			return receiver.removeListener(this, event, listener);
		},

		removeAllListeners(event) {
			return receiver.removeAllListeners(this, event);
		},

		listeners(event) {
			return receiver.listeners(this, event);
		},

		listenerCount(event) {
			return receiver.listenerCount(this, event);
		}
	});

	ClientApi.prototype.on = ClientApi.prototype.addListener;
};
