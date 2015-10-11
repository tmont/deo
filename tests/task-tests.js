var should = require('should'),
	Task = require('../src/task');

describe('Task', function() {
	it('should require a name', function() {
		(function() { new Task() }).should.throwError('A name is required');
	});

	it('should be async if a callback argument is given in definition function', function() {
		function MyTask() {
			Task.call(this, 'mytask');
		}

		Task.extend(MyTask, {
			exec: function(context, callback) {}
		});

		var task = new MyTask();
		task.isAsync().should.equal(true);
	});

	it('should not be async if no callback argument is given in definition function', function() {
		function MyTask() {
			Task.call(this, 'mytask');
		}

		Task.extend(MyTask, {
			exec: function(context) {}
		});

		var task = new MyTask();
		task.isAsync().should.equal(false);
	});
});
