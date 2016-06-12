"use strict";

const owe = require("owe-core");
const filter = require("owe-helpers").filter;

const connector = require("./connector");

function eventRouter(options) {
	if(!options || typeof options !== "object")
		options = {};

	options = {
		filter: "filter" in options ? options.filter : false
	};

	return function servedEventRouter(destination, state) {
		if(!owe.client.isApi(state.origin.eventsApi))
			throw new owe.exposed.Error("Events cannot be accessed via this protocol.");

		if(destination in connector)
			return owe(null, {
				closer: data => {
					if(!data || typeof data !== "object")
						throw new owe.exposed.TypeError(`Invalid ${destination} request.`);

					if("event" in data)
						return filter(options.filter, state, data.event, state).then(result => {
							if(result)
								return connector[destination](
									state.origin.eventsApi,
									state.value,
									data
								);

							throw new owe.exposed.Error(`The event '${data.event}' is not exposed.`);
						});

					return connector[destination](
						state.origin.eventsApi,
						state.value,
						data
					);
				}
			});

		throw new owe.exposed.Error(`Events cannot be accessed via method '${destination}'.`);
	};
}

module.exports = eventRouter;
