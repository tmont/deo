var extend = require('extend'),
	chalk = require('chalk'),
	Graph = require('tarjan-graph');

function Config(log) {
	this.log = log;
	this.targets = {};
	this.tasks = {};
	this.targetGraph = new Graph();
	this.settings = {
		interpolationRegex: /\$\{(.+?)}/g,
		cwd: __dirname
	};

	this.properties = {
		timestamp: function() {
			return Date.now();
		},
		datetime: function() {
			return new Date().toISOString();
		},
		datetimeTz: function() {
			var d = new Date();
			function pad(value, pow) {
				pow = pow || 1;
				return value < Math.pow(10, pow) ? new Array(pow + 1).join('0') + value : value;
			}

			var date = [ d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate()) ].join('-');
			var time = [ pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds()) ].join(':');
			var ms = pad(d.getMilliseconds(), 2);

			return date + ' ' + time + '.' + ms;
		}
	};
}

Config.prototype = {
	interpolate: function(str) {
		str = (str || '').toString();
		var log = this.log;
		var self = this;
		var regex = this.getSetting('interpolationRegex');
		return str.replace(regex, function(match, propertyName) {
			var value = self.getProperty(propertyName);
			if (!value) {
				log.warn('no property found for ' + chalk.yellow(propertyName));
				return '';
			}

			log.trace(
				'replaced ' + chalk.yellow(match) + ' with ' + chalk.underline(value) +
				' in ' + chalk.bold(str)
			);

			return typeof(value) === 'function' ? value() : value || '';
		});
	},

	interpolateObject: function(obj) {
		var self = this;

		if (typeof(obj) === 'string') {
			return this.interpolate(obj);
		}

		if (Array.isArray(obj)) {
			return obj.map(function(value) {
				return self.interpolateObject(value);
			});
		}

		if (obj && typeof(obj) === 'object') {
			Object.keys(obj).forEach(function(key) {
				obj[key] = self.interpolateObject(obj[key]);
			});
			return obj;
		}

		return obj;
	},

	addTargets: function(targets) {
		var taskNames = Object.keys(targets),
			targetMap = this.targets,
			log = this.log,
			registeredTasks = this.tasks,
			self = this;

		taskNames.forEach(function(taskName) {
			var taskCtor = registeredTasks[taskName];
			if (!taskCtor) {
				throw new Error('Attempting to add target for unregistered task "' + taskName + '"');
			}

			log.trace('parsing targets for ' + chalk.bold(taskName));
			var targetDefinitions = targets[taskName];
			Object.keys(targetDefinitions).forEach(function(targetName) {
				var fullTargetName = taskName + ':' + targetName,
					targetOptions = targetDefinitions[targetName],
					realTargetName = targetOptions.alias || fullTargetName;

				if (targetMap[realTargetName]) {
					log.warn('overwriting existing target ' + chalk.bold(realTargetName));
				}

				targetOptions.alias = realTargetName;
				var task = new taskCtor(targetOptions);
				self.registerTaskTarget(realTargetName, task, targetOptions.dependencies || []);
			});
		});
	},

	registerTask: function(ctor, alias) {
		var name = alias || ctor.name;
		if (name in this.tasks) {
			this.log.warn('Overriding existing task ' + chalk.bold(name));
		}

		this.log.debug('registered new task ' + chalk.bold(name));
		this.tasks[name] = ctor;
	},

	registerTaskTarget: function(name, task, dependencies) {
		if (name in this.targets) {
			this.log.warn('Overriding existing target ' + chalk.bold(name));
		}
		this.targets[name] = task;
		this.targetGraph.addAndVerify(name, dependencies || []);
	},

	registerCustomTarget: function(name, dependencies, definition) {
		//TODO
		var task = new CustomTask(name, definition);
		this.registerTaskTarget(name, task, dependencies);
	},

	getTarget: function(name) {
		if (!(name in this.targets)) {
			throw new Error('Target "' + name + '" does not exist');
		}

		return this.targets[name];
	},

	getTargetDependencies: function(name) {
		return this.targetGraph.getDescendants(name);
	},

	setProperty: function(key, value) {
		if (!key) {
			throw new Error('key is required');
		}

		if (typeof(key) === 'object') {
			var self = this;

			function setObjectProperty(obj, prop) {
				Object.keys(obj).forEach(function(key) {
					var newProp = (prop ? prop + '.' : '') + key;
					var value = obj[key];
					if (!value || typeof(value) !== 'object') {
						self.properties[newProp] = value;
						self.log.trace('set property for ' + chalk.yellow(newProp));
						return;
					}
					setObjectProperty(value, newProp);
				});
			}

			setObjectProperty(key);
			return;
		}

		this.properties[key] = this.interpolate(value);
		this.log.trace('set property for ' + chalk.yellow(key));
	},

	getProperty: function(key) {
		this.log.trace('Getting property ' + chalk.yellow(key));
		var value = this.properties[key];
		if (!(key in this.properties)) {
			this.log.warn('Property ' + chalk.yellow(key) + ' does not exist');
		}

		if (typeof(value) === 'function') {
			this.log.trace('Evaluating property ' + chalk.yellow(key));
			value = value();
		}

		return this.interpolate(value);
	},

	setSetting: function(key, value) {
		switch (key) {
			case 'interpolationRegex':
				if (!value || !(value instanceof RegExp) || !value.global) {
					throw new Error('interpolationRegex must be a global regular expression, e.g. /(foo)/g');
				}
				break;
			case 'cwd':
				break;
			default:
				throw new Error('Unknown setting "' + key + '"');
		}

		this.settings[key] = value;
		this.log.debug('set configuration setting for key ' + chalk.bold(key));
	},

	getSetting: function(key) {
		if (!(key in this.settings)) {
			throw new Error('Unknown key "' + key + '" in settings');
		}

		return this.settings[key];
	}
};

module.exports = Config;
