"use strict";

const maybeMap = {
	maybeLookup() {
		return this;
	},

	get() {
		return undefined;
	},

	lookup() {
		return undefined;
	}
};

function generateMap(map) {
	return class extends map {
		constructor(generator) {
			super();

			this.generator = generator;
		}

		get(key) {
			let value = super.get(key);

			if(value === undefined) {
				value = this.generator(key);
				this.set(key, value);
			}

			return value;
		}

		lookup(key) {
			return super.get(key);
		}

		maybeLookup(key) {
			const value = super.get(key);

			return value === undefined ? maybeMap : value;
		}
	};
}

module.exports = {
	Map: generateMap(Map),
	WeakMap: generateMap(WeakMap)
};
