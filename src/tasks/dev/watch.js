var Task = require('../../task'),
	chalk = require('chalk'),
	path = require('path'),
	async = require('async');

function WatchTask(options) {
	options = options || {};
	var src = options.src,
		handlers = options.handlers;

	if (!src) {
		throw new Error('src is required');
	}
	if (!handlers) {
		throw new Error('handlers is required');
	}

	var cwd = options.cwd || null;
	delete options.cwd;

	Object.keys(handlers).forEach(function(name) {
		var handler = handlers[name];
		if (!handler) {
			throw new Error('Invalid handler "' + name + '"');
		}
		if (!(handler.regex instanceof RegExp)) {
			throw new Error('handler.regex must be a regular expression');
		}
		if (!Array.isArray(handler.onMatch) && typeof(handler.onMatch) !== 'function') {
			throw new Error('handler.onMatch must be an array or a function');
		}
	});

	Task.call(this, 'watch', [], {
		src: src,
		cwd: cwd,
		filter: options.filter,
		type: options.type || 'watch',
		handlers: handlers
	});
}

Task.extend(WatchTask, {
	runForever: function() {
		return true;
	},

	dispose: function(context, callback) {
		var log = context.log;
		try {
			log.info('Stopping watchers...');
			context.get('monitors').forEach(function(monitor) {
				monitor.stop();
			});
		} catch (e) {
			log.error('Error trying to safely stop watchers', e);
		}

		callback();
	},

	exec: function(context, callback) {
		var log = context.log;
		try {
			var gargoyle = require('gargoyle');
		} catch (e) {
			callback(new Error('Gargoyle module is not loaded'));
			return;
		}

		var src = this.options.src,
			filter = this.options.filter,
			options = {
				type: this.options.type,
				interval: 100,
				exclude: function(filename, stat) {
					var basename = path.basename(filename);
					if (basename.charAt(0) === '.') {
						return true;
					}

					if (!filter) {
						return false;
					}

					return !filter(filename, stat);
				}
			};

		var self = this;

		context.set('monitors', []);

		function startWatching(src, next) {
			var interval = 500,
				timeoutId;

			gargoyle.monitor(src, options, function(err, monitor) {
				if (err) {
					log.error('Failed to start gargoyle monitor');
					next(err);
					return;
				}

				log.debug('gargoyle configured, watching ' + chalk.yellow(src));

				var modifiedFiles = [],
					runningHandlers = false;

				function handleFile(fileName, modificationType) {
					if (modifiedFiles.indexOf(fileName) !== -1) {
						context.log.debug('already detected change for ' + chalk.yellow(fileName));
						return;
					}

					if (self.options.filter && !self.options.filter(fileName)) {
						context.log.trace('ignoring file ' + chalk.yellow(fileName) + ' due to filter');
						return;
					}

					switch (modificationType) {
						case 'create':
							context.log.info(chalk.green(fileName) + ' was created');
							break;
						case 'delete':
							context.log.info(chalk.gray(fileName) + ' was deleted');
							break;
						case 'modify':
							context.log.info(chalk.blue(fileName) + ' was modified');
							break;
					}

					modifiedFiles.push(fileName);

					clearTimeout(timeoutId);
					timeoutId = setTimeout(function processMatchedFiles() {
						if (runningHandlers) {
							//wait for handlers to complete, and then start again
							log.warn('Handlers have not completed, waiting before trying again...');
							timeoutId = setTimeout(processMatchedFiles, 500);
							return;
						}

						var matchedHandlers = {},
							handlers = self.options.handlers;

						modifiedFiles
							.forEach(function(file) {
								Object.keys(handlers).forEach(function(name) {
									var handler = handlers[name];
									if (handler.regex.test(file)) {
										matchedHandlers[name] = matchedHandlers[name] || [];
										matchedHandlers[name].push(file);
									}
								});
							});

						modifiedFiles = [];

						function runHandler(name, next) {
							log.debug('Running matched handler ' + chalk.underline(name));
							var handler = handlers[name],
								files = matchedHandlers[name],
								onMatch = handler.onMatch;

							if (Array.isArray(onMatch)) {
								//array of tasks
								async.eachSeries(onMatch, function(taskName, next) {
									context.runTask(taskName, next);
								}, next);
							} else {
								handler.onMatch.call(self, files, next);
							}
						}

						runningHandlers = true;
						async.each(Object.keys(matchedHandlers), runHandler, function() {
							log.debug('All handlers completed');
							runningHandlers = false;
						});
					}, interval);
				}

				monitor.on('modify', function(filename) {
					handleFile(filename, 'modify');
				});
				monitor.on('delete', function(filename) {
					handleFile(filename, 'delete');
				});
				monitor.on('create', function(filename) {
					handleFile(filename, 'create');
				});

				context.get('monitors').push(monitor);
				next();
			});
		}

		async.each(src, startWatching, callback);
	}
});

module.exports = WatchTask;
