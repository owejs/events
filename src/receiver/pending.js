"use strict";

const expose = require("../expose");

const counter = require("../counter")();

const pendingMap = new Map();

const pending = {
	createRequest(api, type, entry) {
		const id = counter.count();
		const token = Math.random();

		Object.assign(entry, { id, token });

		pendingMap.set(id, entry);

		return Promise.all([
			new Promise((resolve, reject) => {
				entry.tokenReceiver = { reject, resolve };

				setTimeout(() => reject(new Error("The event emitter could not be identified.")), 10000);
			}),
			api.route(type).close(entry)
		]).then(() => {
			pendingMap.delete(id);

			return entry;
		}, err => {
			pendingMap.delete(id);

			throw err;
		});
	},

	createAddRequest(api, event, listener, once) {
		return this.createRequest(api, "addListener", { event, listener, once });
	},

	createRemoveRequest(api, event) {
		return this.createRequest(api, "removeListener", { event });
	},

	createIdentificationRequest(api) {
		return this.createRequest(api, "listeners", {});
	},

	handleRequestConfirmation(api, confirmation) {
		const entry = pendingMap.get(confirmation.id);

		if(!entry)
			throw expose(new Error(`Invalid pending id '${confirmation.id}'.`));

		if(entry.token !== confirmation.token) {
			entry.tokenReceiver.reject(new Error("The listener handshake was unexpectedly disrupted."));

			return;
		}

		Object.assign(entry, confirmation, { api });
		entry.tokenReceiver.resolve();
	}
};

module.exports = pending;
