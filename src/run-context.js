var Util = require('./util'),
	Logger = require('looger').Logger;

function RunContext(log, parent, options) {
	options = options || {};

	this.started = null;
	this.ended = null;
	this.parent = parent;
	this.items = parent ? parent.items : {};
	this.childContexts = [];
	this.log = log || Logger.noop;
	this.util = new Util(this.log, options.cwd);
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
