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
}

Task.prototype = {
	isAsync: function() {
		return this.definition && this.definition.length === 2;
	}
};


module.exports = Task;
