var should = require('should'),
	async = require('async'),
	path = require('path'),
	fs = require('fs-extra'),
	BrowserifyTask = require('../../src/tasks/web/browserify'),
	RunContext = require('../../src/run-context');

describe('Browserify tasks', function() {
	var rootDir = path.join(__dirname, 'test-files', 'browserify'),
		tmpDir = path.join(__dirname, 'tmp');

	afterEach(function(done) {
		fs.remove(tmpDir, done);
	});

	function verify(dest, file, done) {
		var options = {encoding: 'utf8'};
		fs.readFile(dest, options, function(err, actual) {
			should.not.exist(err);
			fs.readFile(path.join(rootDir, 'compiled', file + '-compiled.js'), options, function(err, expected) {
				should.not.exist(err);
				actual.should.equal(expected);
				done();
			});
		});
	}

	it('should browserify single entry with dependencies', function(done) {
		var dest = path.join(tmpDir, 'browserified.js');
		var task = new BrowserifyTask(path.join(rootDir, 'a.js'), dest),
			context = new RunContext();

		task.exec(context, function(err) {
			should.not.exist(err);
			verify(dest, 'a', done);
		});
	});

	it('should browserify single entry with no dependencies', function(done) {
		var dest = path.join(tmpDir, 'browserified.js');
		var task = new BrowserifyTask(path.join(rootDir, 'b.js'), dest),
			context = new RunContext();

		task.exec(context, function(err) {
			should.not.exist(err);
			verify(dest, 'b', done);
		});
	});

	it('should browserify entries matching pattern', function(done) {
		var dest = path.join(tmpDir, 'browserified.js');
		var task = new BrowserifyTask('a*', dest, { cwd: rootDir }),
			context = new RunContext();

		task.exec(context, function(err) {
			should.not.exist(err);
			verify(dest, 'a', done);
		});
	});

	it('should browserify multiple entries', function(done) {
		var dest = path.join(tmpDir, 'browserified.js');
		var task = new BrowserifyTask('*.js', dest, { cwd: rootDir }),
			context = new RunContext();

		task.exec(context, function(err) {
			should.not.exist(err);
			verify(dest, 'both', done);
		});
	});
});
