var should = require('should'),
	async = require('async'),
	path = require('path'),
	fs = require('fs-extra'),
	DeleteTask = require('../../src/tasks/fs/delete'),
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
});
