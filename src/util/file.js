var chalk = require('chalk'),
	extend = require('extend'),
	fs = require('fs-extra'),
	path = require('path'),
	glob = require('glob'),
	async = require('async'),
	unique = require('array-unique');

function FileUtil(log, cwd) {
	this.log = log;
	this.cwd = cwd;
}

FileUtil.prototype = {
	del: function(file, callback) {
		fs.remove(file, callback);
	},
	copy: function(sourceFile, dest, callback) {
		fs.copy(sourceFile, dest, callback);
	},
	writeFile: function(file, contents, callback) {
		var self = this;
		fs.outputFile(file, contents, function(err) {
			if (err) {
				callback(err);
				return;
			}

			self.log.debug(
				'Wrote ' + chalk.bold(Buffer.byteLength(contents, 'utf8')) + ' bytes to ' +
				chalk.yellow(file)
			);

			callback();
		});
	},
	resolve: function(file) {
		return path.resolve(this.cwd, file);
	},
	mapSrcToDest: function(src, dest, callback) {
		dest = this.resolve(dest);
		function statDest(next) {
			fs.stat(dest, function(err, stat) {
				if (err && (err.code === 'ENOENT')) {
					//it's okay if it doesn't exist
					err = null;
				}

				next(err, stat);
			});
		}

		function statSrc(destStat, next) {
			fs.stat(src[0], function(err, stat) {
				if (err) {
					next(err);
					return;
				}

				next(null, destStat, stat);
			});
		}

		function map(destStat, srcStat, next) {
			if (srcStat.isFile()) {
				if (src.length > 1) {
					if (destStat && !destStat.isDirectory()) {
						next(new Error('Cannot map multiple src files to a non-directory destination'));
					} else {
						//dest is a directory, or there is more than one source file
						//when more than one file is specified in src, we always treat dest as a directory
						next(null, src.map(function(src) {
							return [src, path.join(dest, path.basename(src))];
						}));
					}
				} else {
					//exactly one source file
					if (!destStat || !destStat.isDirectory()) {
						//dest does not exist or is not a directory,
						//i.e. map a single file to a single file
						next(null, src.map(function(src) {
							return [src, dest];
						}));
					} else {
						//dest exists and is a directory, src is a single file
						next(null, src.map(function(src) {
							return [src, path.join(dest, path.basename(src))];
						}));
					}
				}
				return;
			}

			if (srcStat.isDirectory()) {
				if (destStat && !destStat.isDirectory()) {
					//src is a dir, dest is not a dir
					next(new Error('Cannot map source directory to destination that is not a directory'));
					return;
				}

				//src is a dir, dest either doesn't exist, or is a directory
				next(null, src.map(function(src) {
					return [src, dest];
				}));
				return;
			}

			next(new Error('src is not a file or a directory. wat.'));
		}

		async.waterfall([statDest, statSrc, map], callback);
	},
	expand: function(patterns, options, callback) {
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

		function globber(pattern, next) {
			glob(pattern, globOptions, next);
		}

		patterns = Array.isArray(patterns) ? patterns : [patterns];

		async.map(patterns, globber, function(err, arrayOfArrays) {
			if (err) {
				callback(err);
				return;
			}

			var files = arrayOfArrays.reduce(function(files, arr) {
				return files.concat(arr);
			}, []);

			callback(null, unique(files));
		});
	},
	expandAndMap: function(patterns, options, dest, callback) {
		var self = this;
		this.expand(patterns, options, function(err, files) {
			if (err) {
				callback(err);
				return;
			}

			self.mapSrcToDest(files, dest, callback);
		});
	}
};

module.exports = FileUtil;
