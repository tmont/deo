var should = require('should'),
	Task = require('../src/task');

describe('Task', function() {
	it('should require a name', function() {
		(function() { new Task() }).should.throwError('A name is required');
	});

	it('should require a definition', function() {
		(function() { new Task('foo') }).should.throwError('A definition function is required');
	});

	it('should require definition to be a function', function() {
		(function() { new Task('foo', 'bar') }).should.throwError('A definition function is required');
	});

	it('should be async if a callback argument is given in definition function', function() {
		function definition(context, callback) {}

		var task = new Task('foo', definition);
		task.isAsync().should.equal(true);
	});

	it('should not be async if no callback argument is given in definition function', function() {
		function definition(context) {}

		var task = new Task('foo', definition);
		task.isAsync().should.equal(false);
	});
});
