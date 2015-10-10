function Task(name, definition, dependentTasks) {
	if (!name) {
		throw new Error('A name is required');
	}
	if (!definition || typeof(definition) !== 'function') {
		throw new Error('A definition function is required');
	}

	this.name = name;
	this.definition = definition;
	this.dependentTasks = dependentTasks || [];
}

Task.prototype = {
	isAsync: function() {
		return this.definition && this.definition.length === 2;
	}
};


module.exports = Task;
