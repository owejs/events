"use strict";

const owe = require("owe-core");
const filter = require("owe-helpers").filter;

const connector = require("./connector");

function eventRouter(options) {
	if(typeof options !== "object" || options === null)
		options = {};

	options = {
		filter: "filter" in options ? options.filter : false,
		filterInverse: !!options.filterInverse || false
	};

	return function servedEventRouter(route) {
		if(!owe.client.isApi(this.origin.eventsApi))
			throw new owe.exposed.Error(`Events cannot be accessed via this protocol.`);

		if(route in connector)
			return owe(null, {
				closer: data => {
					if(!data || typeof data !== "object")
						throw new owe.exposed.TypeError(`Invalid ${route} request.`);

					if("event" in data)
						return filter(this, data.event, options.filter, result => Promise.resolve(result)).then(result => {
							if(result !== options.filterInverse)
								return connector[route](
									this.origin.eventsApi,
									this.value,
									data
								);

							throw new owe.exposed.Error(`The event '${data.event}' is not exposed.`);
						});

					return connector[route](
						this.origin.eventsApi,
						this.value,
						data
					);
				}
			});

		throw new owe.exposed.Error(`Events cannot be accessed via method '${route}'.`);
	};
}

module.exports = eventRouter;
