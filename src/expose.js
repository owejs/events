"use strict";

module.exports = function expose(err) {
	Object.defineProperty(err, "message", {
		value: err.message,
		enumerable: true
	});

	return err;
};
