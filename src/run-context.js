var FileUtil = require('./util/file'),
	time = require('./util/time'),
	Logger = require('looger').Logger;

function RunContext(log, parent, options) {
	options = options || {};

	this.started = null;
	this.ended = null;
	this.parent = parent;
	this.task = null;
	this.items = parent ? parent.items : {};
	this.childContexts = [];
	this.log = log || Logger.noop;
	this.time = time;
	this.file = new FileUtil(this.log, options.cwd);
	this.deo = null;
}

RunContext.prototype = {
	runTask: function(name, callback) {
		if (!this.deo) {
			callback(new Error('RunContext was misconfigured, no deo object!'));
			return;
		}

		this.deo.runTask(name, callback);
	},

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
	},
	get elapsedFormatted() {
		return time.formatElapsed(this.elapsed);
	}
};

module.exports = RunContext;
