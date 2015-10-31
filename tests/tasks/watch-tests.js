var should = require('should'),
	async = require('async'),
	sinon = require('sinon'),
	path = require('path'),
	fs = require('fs-extra'),
	WatchTask = require('../../src/tasks/dev/watch'),
	RunContext = require('../../src/run-context');

describe('Watch task', function() {
	var rootDir = path.join(__dirname, 'tmp');
	var context;
	var singleFile,
		nestedFile,
		otherDir,
		otherFile,
		nestedDir,
		task;

	beforeEach(function(done) {
		fs.mkdirs(rootDir, done);
	});

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

		async.parallel([
			createSingleFile,
			createOtherFile,
			createNestedDirs,
			createOtherDir ],
			done
		);
	});


	afterEach(function(done) {
		if (task) {
			task.dispose(context, done);
		} else {
			done();
		}
	});

	afterEach(function(done) {
		fs.remove(rootDir, done);
	});

	it('should execute handler when file is modified', function(done) {
		var handlers = {
			foo: {
				regex: /.*\.txt/,
				onMatch: sinon.stub()
			},
			bar: {
				regex: /nope/,
				onMatch: sinon.stub()
			}
		};

		task = new WatchTask({ src: rootDir, handlers: handlers });
		context = new RunContext();

		task.exec(context, function(err) {
			should.not.exist(err);

			fs.writeFile(singleFile, 'foo', function(err) {
				should.not.exist(err);
				setTimeout(function() {
					handlers.foo.onMatch.calledOnce.should.equal(true);
					var args = handlers.foo.onMatch.getCall(0).args;
					args[0].should.have.length(1);
					args[0][0].should.match(/single\.txt$/);
					handlers.bar.onMatch.called.should.equal(false);
					done();
				}, 600);
			});
		});
	});

	it('should execute handler when file is deleted', function(done) {
		var handlers = {
			foo: {
				regex: /.*\.txt/,
				onMatch: sinon.stub()
			},
			bar: {
				regex: /nope/,
				onMatch: sinon.stub()
			}
		};

		task = new WatchTask({ src: rootDir, handlers: handlers });
		context = new RunContext();

		task.exec(context, function(err) {
			should.not.exist(err);

			fs.unlink(singleFile, function(err) {
				should.not.exist(err);
				setTimeout(function() {
					handlers.foo.onMatch.calledOnce.should.equal(true);
					var args = handlers.foo.onMatch.getCall(0).args;
					args[0].should.have.length(1);
					args[0][0].should.match(/single\.txt$/);
					handlers.bar.onMatch.called.should.equal(false);
					done();
				}, 600);
			});
		});
	});

	it('should execute handler when file is created', function(done) {
		var handlers = {
			foo: {
				regex: /.*\.txt/,
				onMatch: sinon.stub()
			},
			bar: {
				regex: /nope/,
				onMatch: sinon.stub()
			}
		};

		task = new WatchTask({ src: rootDir, handlers: handlers });
		context = new RunContext();

		task.exec(context, function(err) {
			should.not.exist(err);

			fs.ensureFile(path.join(rootDir, 'lolz.txt'), function(err) {
				should.not.exist(err);
				setTimeout(function() {
					handlers.foo.onMatch.calledOnce.should.equal(true);
					var args = handlers.foo.onMatch.getCall(0).args;
					args[0].should.have.length(1);
					args[0][0].should.match(/lolz\.txt$/);
					handlers.bar.onMatch.called.should.equal(false);
					done();
				}, 600);
			});
		});
	});

	it('should not execute handler if a file that is not being watched is modified', function(done) {
		var handlers = {
			foo: {
				regex: /.*\.txt/,
				onMatch: sinon.stub()
			},
			bar: {
				regex: /nope/,
				onMatch: sinon.stub()
			}
		};

		task = new WatchTask({ src: singleFile, handlers: handlers });
		context = new RunContext();

		task.exec(context, function(err) {
			should.not.exist(err);

			fs.writeFile(otherFile, 'yarp', function(err) {
				should.not.exist(err);
				setTimeout(function() {
					handlers.foo.onMatch.called.should.equal(false);
					handlers.bar.onMatch.called.should.equal(false);
					done();
				}, 600);
			});
		});
	});

	it('should stop watching after disposed', function(done) {
		var handlers = {
			foo: {
				regex: /.*\.txt/,
				onMatch: sinon.stub()
			}
		};

		task = new WatchTask({ src: rootDir, handlers: handlers });
		context = new RunContext();

		task.exec(context, function(err) {
			should.not.exist(err);

			task.dispose(context, function() {
				fs.writeFile(singleFile, 'yarp', function(err) {
					should.not.exist(err);
					setTimeout(function() {
						handlers.foo.onMatch.called.should.equal(false);
						done();
					}, 600);
				});
			});
		});
	});
});
