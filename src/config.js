var extend = require('extend'),
	chalk = require('chalk');

function Config(log) {
	this.log = log;
	this.targets = {};
	this.tasks = {};
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
				return value < Math.pow(10, pow) ? '0' + value : value;
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
		var log = this.log;
		var self = this;
		var regex = this.getSetting('interpolationRegex');
		return str.replace(regex, function(match, propertyName) {
			var value = self.getProperty(propertyName);
			if (!value) {
				log.warn(chalk.bold('interpolate') + ': ' + 'no property found for ' + chalk.yellow(propertyName));
				return '';
			}

			log.trace(
				'replaced ' + chalk.yellow(match) + ' with ' + chalk.yellow(propertyName) +
				' in ' + chalk.bold(str)
			);

			return typeof(value) === 'function' ? value() : value || '';
		});
	},

	interpolateObject: function(obj) {
		var self = this;

		if (!obj) {
			return '';
		}

		if (typeof(obj) === 'string') {
			return this.interpolate(obj);
		}

		if (Array.isArray(obj)) {
			return obj.map(function(value) {
				return self.interpolateObject(value);
			});
		}

		if (typeof(obj) === 'object') {
			Object.keys(obj).forEach(function(key) {
				obj[key] = self.interpolateObject(obj[key]);
			});
			return obj;
		}

		return '';
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
				self.registerTaskTarget(realTargetName, task);
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

	registerTaskTarget: function(name, task) {
		if (name in this.targets) {
			this.log.warn('Overriding existing target ' + chalk.bold(name));
		}
		this.targets[name] = task;
	},

	registerCustomTarget: function(name, dependencies, definition) {
		var task = new CustomTask(name, dependencies, definition);
		this.registerTaskTarget(name, task);
	},

	getTarget: function(name) {
		if (!(name in this.targets)) {
			throw new Error('Target "' + name + '" does not exist');
		}

		return this.targets[name];
	},

	addProperties: function(properties) {
		var self = this;
		var keys = Object.keys(properties);
		var interpolatedProperties = keys.reduce(function(obj, key) {
			obj[key] = self.interpolateObject(properties[key]);
			return obj;
		}, {});

		extend(true, this.properties, interpolatedProperties);
		this.log.trace(
			'merged in ' + chalk.yellow(keys.length) + ' '  +
			(keys.length === 1 ? 'property' : 'properties')
		);
	},

	getProperty: function(key) {
		this.log.trace('Getting property ' + chalk.yellow(key));
		var value = this.properties;
		var keys = key.split('.'),
			currentKey = keys.shift();
		while (currentKey && value) {
			value = value[currentKey];
			currentKey = keys.shift();
		}

		return value;
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
