var should = require('should'),
	async = require('async'),
	path = require('path'),
	fs = require('fs-extra'),
	LessTask = require('../../src/tasks/web/less'),
	RunContext = require('../../src/run-context');

describe('Less tasks', function() {
	var rootDir = path.join(__dirname, 'test-files', 'less'),
		tmpDir = path.join(__dirname, 'tmp');

	afterEach(function(done) {
		fs.remove(tmpDir, done);
	});

	function verify(dest, file, done) {
		var options = {encoding: 'utf8'};
		fs.readFile(dest, options, function(err, actual) {
			should.not.exist(err);
			fs.readFile(path.join(rootDir, 'compiled', file + '-compiled.less'), options, function(err, expected) {
				should.not.exist(err);
				actual.should.equal(expected);
				done();
			});
		});
	}

	it('should compile single file with @imports', function(done) {
		var dest = path.join(tmpDir, 'lessified.less');
		var task = new LessTask(path.join(rootDir, 'a.less'), dest),
			context = new RunContext();

		task.exec(context, function(err) {
			should.not.exist(err);
			verify(dest, 'a', done);
		});
	});

	it('should compile multiple files and concatenate them', function(done) {
		var dest = path.join(tmpDir, 'lessified.less');
		var task = new LessTask([ 'a.less', 'c.less' ], dest, { cwd: rootDir }),
			context = new RunContext();

		task.exec(context, function(err) {
			should.not.exist(err);
			verify(dest, 'a-c', done);
		});
	});

	it('should compile single file with options', function(done) {
		var dest = path.join(tmpDir, 'lessified.less');
		var options = {
			modifyVars: {
				'font-size': '14px'
			}
		};
		var task = new LessTask(path.join(rootDir, 'a.less'), dest, options),
			context = new RunContext();

		task.exec(context, function(err) {
			should.not.exist(err);
			verify(dest, 'a-modified', done);
		});
	});
});
