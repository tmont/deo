var Task = require('../../task'),
	chalk = require('chalk'),
	extend = require('extend'),
	path = require('path'),
	async = require('async'),
	fs = require('fs-extra');

function BrowserifyTask(src, dest, options) {
	if (!src) {
		throw new Error('src is required');
	}
	if (!dest) {
		throw new Error('dest is required');
	}
	options = options || {};

	var cwd = options.cwd || null;
	delete options.cwd;

	Task.call(this, 'browserify', [], {
		src: src,
		dest: dest,
		cwd: cwd,
		browserifyOpts: options
	});
}

Task.extend(BrowserifyTask, {
	exec: function(context, callback) {
		var self = this,
			options = { cwd: this.options.cwd },
			src = this.options.src,
			dest = context.util.file.resolve(this.options.dest);

		try {
			var browserify = require('browserify');
		} catch (e) {
			callback(new Error('Unable to load browserify module'));
			return;
		}

		function verifyDest(next) {
			fs.stat(dest, function(err, stat) {
				if (err) {
					if (err.code === 'ENOENT') {
						//doesn't exist, that's okay
						err = null;
					}

					next(err);
					return;
				}

				if (!stat.isFile()) {
					next(new Error(
						'Can only output browserify result to a file: ' + chalk.yellow(dest) +
						' is not a file'
					));
					return;
				}

				next();
			});
		}

		function doBrowserification(next) {
			context.util.file.expand(src, options, function(err, entries) {
				if (err) {
					next(err);
					return;
				}

				if (!entries.length) {
					next(new Error('Found no files matching ' + chalk.bold(src)));
					return;
				}

				var options = extend(self.options.browserifyOpts, {
					entries: entries
				});

				context.util.log.info(
					'Browserifying ' + chalk.bold(entries.length) + ' file' +
					(entries.length === 1 ? '' : 's') + ' into ' + chalk.yellow(dest)
				);

				var b = browserify(options);

				function bundle(done) {
					b.bundle(done);
				}

				context.util.time(bundle, function(err, result) {
					if (err) {
						next(err);
						return;
					}

					var bundle = result.value,
						elapsed = context.util.formatElapsed(result.elapsed);

					context.util.log.info('browserify bundle completed in ' + chalk.bold(elapsed));
					context.util.file.writeFile(dest, bundle, next);
				});
			});
		}

		async.series([ verifyDest, doBrowserification ], function(err) {
			if (err) {
				callback(err);
				return;
			}

			callback();
		});
	}
});

module.exports = BrowserifyTask;
