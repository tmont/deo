var should = require('should'),
	async = require('async'),
	path = require('path'),
	fs = require('fs-extra'),
	DeleteTask = require('../../src/tasks/fs/delete'),
	CopyTask = require('../../src/tasks/fs/copy'),
	RunContext = require('../../src/run-context');

describe('File system tasks', function() {
	var rootDir = path.join(__dirname, 'tmp');
	beforeEach(function(done) {
		fs.mkdirs(rootDir, done);
	});

	afterEach(function(done) {
		fs.remove(rootDir, done);
	});

	describe('delete', function() {
		var singleFile,
			nestedFile,
			nestedDir;

		beforeEach(function(done) {
			function createSingleFile(next) {
				singleFile = path.join(rootDir, 'single.txt');
				fs.ensureFile(singleFile, next);
			}

			function createNestedDirs(next) {
				nestedDir = path.join(rootDir, 'dir1');
				nestedFile = path.join(nestedDir, 'dir2', 'file.txt');

				fs.ensureFile(nestedFile, next);
			}

			async.parallel([ createSingleFile, createNestedDirs ], done);
		});

		function verifyDeleted(files, callback) {
			async.each(Array.isArray(files) ? files : [ files ], function(file, next) {
				fs.stat(file, function(err) {
					should.exist(err);
					err.should.have.property('code', 'ENOENT');
					next();
				});
			}, callback);
		}

		it('should delete single file', function(done) {
			var task = new DeleteTask(singleFile),
				context = new RunContext();

			task.definition(context, function(err, files) {
				should.not.exist(err);
				files.should.have.length(1);
				verifyDeleted(singleFile, done);
			});
		});

		it('should delete directory with contents', function(done) {
			var task = new DeleteTask(nestedDir),
				context = new RunContext();

			task.definition(context, function(err, files) {
				should.not.exist(err);
				files.should.have.length(1);
				verifyDeleted(nestedDir, done);
			});
		});

		it('should delete stuff that matches glob pattern', function(done) {
			var task = new DeleteTask(rootDir + '/**/*.txt'),
				context = new RunContext();

			task.definition(context, function(err, files) {
				should.not.exist(err);
				files.should.have.length(2);
				verifyDeleted([ singleFile, nestedFile ], done);
			});
		});

		it('should use cwd for matching glob patterns', function(done) {
			var task = new DeleteTask('single*', { cwd: nestedDir }),
				context = new RunContext();

			task.definition(context, function(err, files) {
				should.not.exist(err);
				files.should.have.length(0);

				var task = new DeleteTask('single*', { cwd: rootDir }),
					context = new RunContext();

				task.definition(context, function(err, files) {
					should.not.exist(err);
					files.should.have.length(1);
					verifyDeleted(singleFile, done);
				});
			});
		});
	});

	describe('copy', function() {
		var singleFile,
			nestedFile,
			otherDir,
			otherFile,
			nestedDir;

		beforeEach(function(done) {
			function createSingleFile(next) {
				singleFile = path.join(rootDir, 'single.txt');
				fs.ensureFile(singleFile, next);
			}

			function createOtherFile(next) {
				otherFile = path.join(rootDir, 'other.txt');
				fs.ensureFile(otherFile, next);
			}

			function createNestedDirs(next) {
				nestedDir = path.join(rootDir, 'dir1');
				nestedFile = path.join(nestedDir, 'dir2', 'file.txt');

				fs.ensureFile(nestedFile, next);
			}

			function createOtherDir(next) {
				otherDir = path.join(rootDir, 'other');

				fs.ensureFile(otherDir, next);
			}

			async.parallel([ createSingleFile, createOtherFile, createNestedDirs, createOtherDir ], done);
		});

		function verifyExists(files, callback) {
			async.each(Array.isArray(files) ? files : [files], function(file, next) {
				fs.stat(file, function(err) {
					should.not.exist(err);
					next();
				});
			}, callback);
		}

		it('should copy single file to another file', function(done) {
			var dest = path.join(rootDir, 'copied.txt');
			var task = new CopyTask(singleFile, dest),
				context = new RunContext();

			task.definition(context, function(err, files) {
				should.not.exist(err);
				files.should.have.length(1);
				verifyExists([ singleFile, dest ], done);
			});
		});

		it('should copy single file to another directory', function(done) {
			var task = new CopyTask(singleFile, nestedDir),
				context = new RunContext();

			task.definition(context, function(err, files) {
				should.not.exist(err);
				files.should.have.length(1);
				verifyExists([singleFile, path.join(nestedDir, path.basename(singleFile)) ], done);
			});
		});

		it('should copy directory to another directory that does not exist', function(done) {
			var dest = path.join(rootDir, 'copied');
			var task = new CopyTask(nestedDir, dest),
				context = new RunContext();

			task.definition(context, function(err, files) {
				should.not.exist(err);
				files.should.have.length(1);
				verifyExists([ nestedDir, dest, path.join(dest, 'dir2', 'file.txt') ], done);
			});
		});

		it('should copy directory to an existing directory', function(done) {
			var dest = path.join(rootDir, 'copied');
			var task = new CopyTask(nestedDir, dest),
				context = new RunContext();

			task.definition(context, function(err, files) {
				should.not.exist(err);
				files.should.have.length(1);
				verifyExists([nestedDir, dest, path.join(dest, 'dir2', 'file.txt')], done);
			});
		});

		it('should copy multiple files to directory and respect cwd option', function(done) {
			var dest = path.join(rootDir, 'copied');
			var task = new CopyTask('*.txt', dest, { cwd: rootDir }),
				context = new RunContext();

			task.definition(context, function(err, files) {
				should.not.exist(err);
				files.should.have.length(2);
				verifyExists([ singleFile, otherFile, path.join(dest, 'other.txt'), path.join(dest, 'single.txt') ], done);
			});
		});

		it('should not allow copying directory to file', function(done) {
			var task = new CopyTask(nestedDir, singleFile),
				context = new RunContext();

			task.definition(context, function(err) {
				should.exist(err);
				err.should.have.property('message', 'Cannot map source directory to destination that is not a directory');
				done();
			});
		});
	});
});
