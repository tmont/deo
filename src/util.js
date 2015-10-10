var fs = require('fs-extra'),
	extend = require('extend'),
	path = require('path'),
	glob = require('glob');

function Util(cwd) {
	this.cwd = cwd;
	this.file = new FileUtil(cwd);
}

function FileUtil(cwd) {
	this.cwd = cwd;
}

FileUtil.prototype = {
	del: function(file, callback) {
		fs.remove(file, callback);
	},
	expand: function(pattern, options, callback) {
		var globOptions = extend({
			silent: true,
			strict: true,
			nocase: true,
			nodir: false,
			realpath: true
		}, options);

		globOptions.cwd = globOptions.cwd || this.cwd;

		if (!globOptions.cwd) {
			//glob does not allow empty cwd
			delete globOptions.cwd;
		}

		glob(pattern, globOptions, function(err, files) {
			if (err) {
				callback(err);
				return;
			}

			callback(null, files);
		});
	}
};

module.exports = Util;