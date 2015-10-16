var extend = require('extend');

function Task(name, dependentTasks, options) {
	if (!name) {
		throw new Error('A name is required');
	}

	options = options || {};

	this.name = name;
	this.dependentTasks = dependentTasks || [];
	this.options = options;
	if (this.options.src) {
		if (!Array.isArray(this.options.src)) {
			this.options.src = [ this.options.src ];
		}
	}
}

Task.prototype = {
	exec: function() {

	},
	dispose: function(context, callback) {
		callback();
	},
	isAsync: function() {
		return this.exec.length === 2;
	},
	runForever: function() {
		return false;
	}
};

Task.extend = function(ctor, proto) {
	ctor.prototype = Object.create(Task.prototype, {
		constructor: {
			value: ctor,
			enumerable: false,
			writable: true,
			configurable: true
		}
	});

	extend(ctor.prototype, proto);
};

module.exports = Task;
