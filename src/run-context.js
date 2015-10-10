function RunContext(log, parent) {
	if (!log) {
		throw new Error('A log is required');
	}

	this.started = null;
	this.ended = null;
	this.parent = parent;
	this.items = parent ? parent.items : {};
	this.childContexts = [];
	this.log = log;
}

RunContext.prototype = {
	createChildContext: function() {
		var childContext = new RunContext(this.log, this);
		this.childContexts.push(childContext);
		return childContext;
	},

	get: function(key) {
		return this.items[key];
	},

	set: function(key, value) {
		this.items[key] = value;
		return this;
	},
	get elapsed() {
		if (!this.started || !this.ended) {
			return 0;
		}

		return this.ended.getTime() - this.started.getTime();
	}
};

module.exports = RunContext;
