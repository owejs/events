"use strict";

const owe = require("owe-core");

const events = {
	controller: owe({
		__proto__: null,

		receiver: require("./receiver"),
		connector: require("./connector")
	}, {
		router(route) {
			return this.value[route];
		}
	}),
	router: require("./router")
};

module.exports = Object.assign(options => ({
	router: events.router(options)
}), events);
