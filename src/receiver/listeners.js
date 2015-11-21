"use strict";

const generating = require("../generatingMaps");

const disconnectCleaner = require("../disconnectCleaner");

// ClientApi => event emitting objects:
const apis = new generating.WeakMap(
	// event emitting object => events:
	() => new generating.Map(
		// event => set of listeners:
		() => new generating.Map(
			// Every listener is stored as an object of the form { listener: [fn], once: [bool] }.
			() => new Set()
		)
	)
);

const callDelayers = new generating.Map(() => new Set());

const listeners = {
	add(entry) {
		this.call({
			api: entry.api,
			object: entry.object,
			event: "newListener"
		}, [entry.event, entry.listener]);

		apis.get(entry.api).get(entry.object).get(entry.event).add({
			listener: entry.listener,
			once: entry.once
		});

		disconnectCleaner.attach(entry.api, this);
	},

	getListeners(entry) {
		return apis.maybeLookup(entry.api).maybeLookup(entry.object).lookup(entry.event);
	},

	removeApi(api) {
		const objects = apis.lookup(api);

		if(!objects)
			return false;

		for(const object of objects)
			this.removeAll({ api, object });

		return true;
	},

	remove(entry) {
		const listeners = this.getListeners(entry);

		if(!listeners)
			return false;

		for(const listenerMeta of listeners)
			if(listenerMeta.listener === entry.listener)
				return this.removeSpecific(entry, listenerMeta);

		return false;
	},

	removeAll(entry) {
		if(entry.event == null) {
			const events = apis.maybeLookup(entry.api).lookup(entry.object);

			if(!events)
				return false;

			for(const event of events)
				for(const listenerMeta of event)
					this.removeSpecific(entry, listenerMeta);

			return true;
		}

		const listeners = this.getListeners(entry);

		if(!listeners)
			return false;

		for(const listenerMeta of listeners)
			this.removeSpecific(entry, listenerMeta);

		return true;
	},

	removeSpecific(entry, listenerMeta) {
		const api = apis.lookup(entry.api);

		if(!api)
			return false;

		const object = api.lookup(entry.object);

		if(!object)
			return false;

		const listeners = object.lookup(entry.event);

		if(!listeners)
			return false;

		const res = listeners.delete(listenerMeta);

		if(listeners.size === 0) {
			object.delete(entry.event);

			entry.api.close({
				type: "remove",
				object: entry.object,
				event: entry.event
			});
		}

		if(object.size === 0)
			api.delete(entry.object);

		if(api.size === 0) {
			apis.delete(entry.api);
			disconnectCleaner.detach(entry.api, this);
		}

		this.call({
			api: entry.api,
			object: entry.object,
			event: "removeListener"
		}, [entry.event, listenerMeta.listener]);

		return res;
	},

	call(entry, args) {
		const listeners = this.getListeners(entry);

		if(!listeners)
			return;

		const delayers = this.getCallDelayers(entry.event);

		if(delayers.length > 0) {
			delayers.then(() => this.call(entry, args));

			return;
		}

		for(const listenerMeta of listeners) {
			if(listenerMeta.once)
				this.removeSpecific(entry, listenerMeta);

			// Call the listener function with the given arguments,
			// use a ClientApi pointing to the EventEmitter on the server as the context:
			listenerMeta.listener.apply(entry.api.route(entry.object), args);
		}
	},

	addCallDelayer(event, delayer) {

		if(event === undefined)
			event = null;

		const destructor = () => {
			const delayers = callDelayers.lookup(event);

			if(!delayers)
				return;

			delayers.delete(selfDestructingDelayer);

			if(delayers.size === 0)
				callDelayers.delete(event);
		};

		const selfDestructingDelayer = delayer.then(destructor, destructor);

		callDelayers.get(event).add(selfDestructingDelayer);

		return delayer;
	},

	getCallDelayers(event) {
		const delayers = callDelayers.lookup(event) || [];
		const globalDelayers = callDelayers.lookup(null) || [];

		return [...delayers, ...globalDelayers];
	}
};

module.exports = listeners;
