"use strict";

module.exports = function generateCounter() {
	let position = 0;

	return {
		count() {
			if(!Number.isSafeInteger(position) || position === -1)
				position = Number.MIN_SAFE_INTEGER;

			return position++;
		}
	};
};
