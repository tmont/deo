var Task = require('../../task'),
	chalk = require('chalk'),
	async = require('async'),
	fs = require('fs-extra');

function DeleteTask(src, options) {
	options = options || {};
	var self = this;

	function definition(context, callback) {
		var options = { cwd: self.options.cwd };
		context.util.file.expand(src, options, function(err, files) {
			if (err) {
				callback(err);
				return;
			}

			function unlink(file, next) {
				context.log.debug('Deleting ' + chalk.yellow(file));
				context.util.file.del(file, next);
			}

			async.each(files, unlink, function(err) {
				if (err) {
					callback(err);
					return;
				}

				context.log.info('Deleted ' + chalk.bold(files.length) + 'file' + (files.length === 1 ? '' : 's'));
				callback(null, files);
			});
		});
	}

	Task.call(this, 'del', definition, [], {
		src: src,
		cwd: options.cwd || null
	});
}

Task.extend(DeleteTask);

module.exports = DeleteTask;
