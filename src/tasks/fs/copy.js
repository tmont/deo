var Task = require('../../task'),
	chalk = require('chalk'),
	path = require('path'),
	async = require('async'),
	fs = require('fs-extra');

function CopyTask(src, dest, options) {
	if (!src) {
		throw new Error('src is required');
	}
	if (!dest) {
		throw new Error('dest is required');
	}
	options = options || {};
	var self = this;

	function definition(context, callback) {
		var options = { cwd: self.options.cwd };

		var src = self.options.src;

		context.util.file.expandAndMap(src, options, dest, function(err, srcMaps) {
			if (err) {
				callback(err);
				return;
			}

			function copy(srcMap, next) {
				var src = srcMap[0],
					dest = srcMap[1];
				context.log.debug('Copying ' + chalk.yellow(src) + ' to ' + chalk.yellow(dest));
				context.util.file.copy(src, dest, next);
			}

			async.each(srcMaps, copy, function(err) {
				if (err) {
					callback(err);
					return;
				}

				context.log.info(
					'Copied ' + chalk.bold(srcMaps.length) + 'file' + (srcMaps.length === 1 ? '' : 's') +
					' into ' + chalk.yellow(dest)
				);

				callback(null, srcMaps);
			});
		});
	}

	Task.call(this, 'copy', definition, [], {
		src: src,
		dest: dest,
		cwd: options.cwd || null
	});
}

Task.extend(CopyTask);

module.exports = CopyTask;
