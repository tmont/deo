var Task = require('../../task'),
	chalk = require('chalk'),
	path = require('path'),
	async = require('async');

function WatchTask(src, handlers, options) {
	if (!src) {
		throw new Error('src is required');
	}
	if (!handlers) {
		throw new Error('handlers is required');
	}
	options = options || {};

	var cwd = options.cwd || null;
	delete options.cwd;

	Task.call(this, 'watch', [], {
		src: src,
		cwd: cwd,
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
			options = {
				type: this.options.type,
				interval: 100,
				exclude: function(filename, stat) {
					var basename = path.basename(filename);
					return basename.charAt(0) === '.';
				}
			};

		var self = this;

		context.set('monitors', []);

		function startWatching(src, next) {
			var timeout = 500,
				timeoutId;

			gargoyle.monitor(src, options, function(err, monitor) {
				if (err) {
					log.error('Failed to start gargoyle monitor');
					next(err);
					return;
				}

				log.debug('gargoyle configured, watching ' + chalk.yellow(src));

				var modifiedFiles = [];

				function handleFile(fileName) {
					if (modifiedFiles.indexOf(fileName) !== -1) {
						return;
					}

					modifiedFiles.push(fileName);

					clearTimeout(timeoutId);
					timeoutId = setTimeout(function() {
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

						Object.keys(matchedHandlers).forEach(function(name) {
							var handler = handlers[name],
								files = matchedHandlers[name];

							handler.onMatch.call(self, files);
						});

						modifiedFiles = [];
					}, timeout);
				}

				monitor.on('modify', function(filename) {
					log.info('gargoyle: ' + chalk.blue(filename) + ' was modified');
					handleFile(filename);
				});
				monitor.on('delete', function(filename) {
					log.info('gargoyle: ' + chalk.gray(filename) + ' was deleted');
					handleFile(filename);
				});
				monitor.on('create', function(filename) {
					log.info('gargoyle: ' + chalk.green(filename) + ' was created');
					handleFile(filename);
				});

				context.get('monitors').push(monitor);
				next();
			});
		}

		async.each(src, startWatching, callback);
	}
});

module.exports = WatchTask;
