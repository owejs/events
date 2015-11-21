"use strict";

const owe = require("owe-core");
const expose = require("./expose");

const connector = require("./connector");

function eventRouter() {
	return function servedEventRouter(route) {
		if(!owe.client.isApi(this.origin.eventsApi))
			throw expose(new Error(`Events cannot be accessed via this protocol.`));

		if(route in connector)
			return owe(null, {
				closer: data => {
					if(!data || typeof data !== "object")
						throw expose(new TypeError(`Invalid ${route} request.`));

					return connector[route](
						this.origin.eventsApi,
						this.value,
						data
					);
				}
			});

		throw expose(new Error(`Events cannot be accessed via method '${route}'.`));
	};
}

module.exports = eventRouter;
