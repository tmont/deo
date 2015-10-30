var TaskRunner = require('./task-runner'),
	RunContext = require('./run-context'),
	async = require('async'),
	extend = require('extend'),
	chalk = require('chalk');

function Deo(log, config) {
	this.log = log;
	this.config = config;
	this.runners = [];
}

Deo.prototype = {
	set: function(key, value) {
		this.config.setSetting(key, value);
		return this;
	},
	get: function(key) {
		return this.config.getSetting(key);
	},
	setProperty: function(key, value) {
		this.config.setProperty(key, value);
		return this;
	},
	getProperty: function(key) {
		return this.config.getProperty(key);
	},
	register: function(moduleName, alias) {
		var task;
		switch (typeof(moduleName)) {
			case 'string':
				this.log.trace('require()\'ing module ' + chalk.bold(moduleName));
				try {
					task = require(moduleName);
				} catch (e) {
					throw new Error('Unable to load NPM module "' + moduleName + '"');
				}
				break;
			case 'function':
				task = moduleName;
				break;
			default:
				throw new Error('first argument to register() must be a string or a function');
		}

		this.config.registerTask(task, alias);
		return this;
	},
	target: function(name, dependencies, definition) {
		if (typeof(dependencies) === 'function') {
			definition = dependencies;
			dependencies = [];
		}

		if (typeof(name) !== 'string') {
			throw new Error('name must be a string');
		}
		if (!Array.isArray(dependencies)) {
			throw new Error('dependencies must be an array');
		}

		this.config.registerCustomTarget(name, dependencies, definition);
		return this;
	},
	targets: function(targets) {
		if (typeof(targets) !== 'object' || !targets) {
			throw new Error('targets must be an object');
		}

		this.config.addTargets(targets);
		return this;
	},
	runTask: function(name, callback) {
		var options = {
			cwd: this.config.getSetting('cwd')
		};
		this.log.trace('Creating runner for task ' + chalk.bold(name));
		var context = new RunContext(this.log, null, options);
		var runner = new TaskRunner(context);
		try {
			var task = this.config.getTarget(name);
		} catch (e) {
			callback(e);
			return;
		}

		task.options = this.config.interpolateObject(extend({}, task.options));

		this.runners.push(runner);
		runner.run(task, callback);
	},
	isRunning: function() {
		return this.runners.some(function(runner) {
			return runner.state === TaskRunner.state.running;
		});
	},
	kill: function(callback) {
		this.log.trace('Disposing of task runners');
		var log = this.log;
		var errors = [];
		function stopRunner(runner, next) {
			log.debug('Disposing of task runner for ' + chalk.bold(runner.getName()));
			runner.dispose(function(err) {
				if (err) {
					log.error(err);
					errors.push(err);
				}

				//always dispose of all runners, regardless of if previous ones erred
				next();
			});
		}

		async.each(this.runners, stopRunner, function() {
			callback(errors.length ? errors : null);
		});
	}
};

module.exports = Deo;
