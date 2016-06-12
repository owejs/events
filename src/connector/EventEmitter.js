"use strict";

const generating = require("../generatingMaps");

const counter = require("../counter")();
const disconnectCleaner = require("../disconnectCleaner");

const objectToEventEmitter = new generating.WeakMap(object => new EventEmitter(object));
const idToEventEmitter = new Map();

class EventEmitter {
	static forObject(object) {
		return objectToEventEmitter.get(object);
	}

	static lookupObject(object) {
		return objectToEventEmitter.lookup(object);
	}

	static lookupId(id) {
		return idToEventEmitter.get(id);
	}

	constructor(object) {
		if(objectToEventEmitter.has(object))
			throw new Error("There already is an EventEmitter for this object.");

		const id = this.id = counter.count();

		this.object = object;

		this.events = new generating.Map(event => {
			if(event === "newListener" || event === "removeListener")
				return {
					apis: new Set()
				};

			const eventMeta = {
				apis: new Set(),
				listener(...args) {
					const send = {
						type: "emit",
						object: id,
						event,
						args
					};

					eventMeta.apis.forEach(api => api.close(send));
				}
			};

			this.object.addListener(event, eventMeta.listener);

			return eventMeta;
		});

		this.removalListener = (event, listener) => {
			const eventMeta = this.events.lookup(event);

			if(eventMeta && eventMeta.listener === listener)
				eventMeta.apis.forEach(api => this.removeListener(event, api));
		};

		this.object.addListener("removeListener", this.removalListener);

		idToEventEmitter.set(id, this);
	}

	addListener(event, api) {
		this.events.get(event).apis.add(api);
		disconnectCleaner.attach(api, this);
	}

	removeListener(event, api) {
		if(event == null)
			return this.removeApi(api);

		const eventMeta = this.events.lookup(event);

		if(!eventMeta)
			return false;

		const res = eventMeta.apis.delete(api);

		disconnectCleaner.detach(api, this);

		if(eventMeta.apis.size === 0) {
			this.events.delete(event);
			this.object.removeListener(event, eventMeta.listener);
		}

		if(this.events.size === 0) {
			idToEventEmitter.delete(this.id);
			objectToEventEmitter.delete(this.object);
			this.object.removeListener("removeListener", this.removalListener);
		}

		if(res)
			api.close({
				type: "remove",
				object: this.id,
				event
			});

		return res;
	}

	removeApi(api) {
		let once = false;

		for(const event of this.events.keys())
			once = this.removeListener(event, api) || once;

		return once;
	}
}

module.exports = EventEmitter;
