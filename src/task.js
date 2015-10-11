function Task(name, definition, dependentTasks, options) {
	if (!name) {
		throw new Error('A name is required');
	}
	if (!definition || typeof(definition) !== 'function') {
		throw new Error('A definition function is required');
	}

	options = options || {};

	this.name = name;
	this.definition = definition;
	this.dependentTasks = dependentTasks || [];
	this.options = options;
	if (this.options.src) {
		if (!Array.isArray(this.options.src)) {
			this.options.src = [ this.options.src ];
		}
	}
}

Task.prototype = {
	isAsync: function() {
		return this.definition && this.definition.length === 2;
	}
};

Task.extend = function(ctor) {
	ctor.prototype = Object.create(Task.prototype, {
		constructor: {
			value: ctor,
			enumerable: false,
			writable: true,
			configurable: true
		}
	});
};

module.exports = Task;
