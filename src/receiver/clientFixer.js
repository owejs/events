"use strict";

const ClientApi = require("owe-core/src/ClientApi");
const passthrough = require("owe-core").proxify.passthrough;

module.exports = receiver => {
	const extension = {
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
	};

	extension.on = extension.addListener;

	Object.assign(ClientApi.prototype, extension);
	Object.keys(extension).forEach(key => ClientApi.prototype[passthrough].add(key));
};
