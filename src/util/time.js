module.exports = {
	formatElapsed: function(elapsed) {
		var pretty;

		var oneSecond = 1000,
			oneMinute = oneSecond * 60;

		var rest = elapsed;
		var minutes = Math.floor(rest / oneMinute);
		rest -= (minutes * oneMinute);
		var seconds = Math.floor(rest / oneSecond);
		rest -= (seconds * oneSecond);
		var ms = rest;

		function pad(value) {
			return value < 10 ? '0' + value : value;
		}

		if (minutes > 0) {
			pretty = minutes + 'm ' + seconds + 's';
		} else if (seconds > 0) {
			pretty = seconds + '.' + pad(Math.round(ms / 10)) + 's';
		} else {
			pretty = ms + 'ms';
		}

		return pretty;
	},

	benchmark: function(thunk, callback) {
		var start = Date.now();
		thunk(function(err, result) {
			callback(err, {
				elapsed: Date.now() - start,
				value: result
			});
		});
	}
};