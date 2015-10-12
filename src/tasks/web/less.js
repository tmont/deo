var Task = require('../../task'),
	chalk = require('chalk'),
	extend = require('extend'),
	path = require('path'),
	async = require('async'),
	fs = require('fs-extra');

function LessTask(src, dest, options) {
	if (!src) {
		throw new Error('src is required');
	}
	if (!dest) {
		throw new Error('dest is required');
	}
	options = options || {};

	var cwd = options.cwd || null;
	delete options.cwd;

	Task.call(this, 'less', [], {
		src: src,
		dest: dest,
		cwd: cwd,
		lessOpts: options
	});
}

Task.extend(LessTask, {
	exec: function(context, callback) {
		var self = this,
			options = { cwd: this.options.cwd },
			src = this.options.src,
			dest = context.util.file.resolve(this.options.dest);

		try {
			var less = require('less');
		} catch (e) {
			callback(new Error('Unable to load less module'));
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
						'Can only output less result to a file: ' + chalk.yellow(dest) +
						' is not a file'
					));
					return;
				}

				next();
			});
		}

		function doLessification(next) {
			context.util.file.expand(src, options, function(err, files) {
				if (err) {
					next(err);
					return;
				}

				if (!files.length) {
					next(new Error('Found no files matching ' + chalk.bold(src)));
					return;
				}

				var options = extend({ filename: files[0] }, self.options.lessOpts);

				context.log.info(
					'Compiling ' + chalk.bold(files.length) + ' less file' +
					(files.length === 1 ? '' : 's') + ' ' + String.fromCharCode(0x2191) +
					' ' + chalk.yellow(dest)
				);

				function compile(done) {
					function readFile(file, next) {
						fs.readFile(file, { encoding: 'utf8' }, next);
					}

					context.log.debug('Concatenating input files...');
					async.map(files, readFile, function(err, inputs) {
						if (err) {
							done(err);
							return;
						}

						var input = inputs.join('\n');
						less.render(input, options, done);
					});
				}

				context.util.time(compile, function(err, result) {
					if (err) {
						next(err);
						return;
					}

					var css = result.value.css,
						elapsed = context.util.formatElapsed(result.elapsed);

					context.log.info('less compilation completed in ' + chalk.bold(elapsed));
					context.util.file.writeFile(dest, css, next);
				});
			});
		}

		async.series([ verifyDest, doLessification ], function(err) {
			if (err) {
				callback(err);
				return;
			}

			callback();
		});
	}
});

module.exports = LessTask;
