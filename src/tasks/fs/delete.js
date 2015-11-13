var Task = require('../../task'),
	chalk = require('chalk'),
	async = require('async'),
	fs = require('fs-extra');

function DeleteTask(src, options) {
	options = options || {};
	Task.call(this, 'delete', {
		src: src,
		cwd: options.cwd || null
	});
}

Task.extend(DeleteTask, {
	exec: function(context, callback) {
		var options = { cwd: this.options.cwd },
			src = this.options.src;

		context.file.expand(src, options, function(err, files) {
			if (err) {
				callback(err);
				return;
			}

			function unlink(file, next) {
				context.log.debug('Deleting ' + chalk.yellow(file));
				context.file.del(file, next);
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
});

module.exports = DeleteTask;
