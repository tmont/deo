var should = require('should'),
	sinon = require('sinon'),
	Task = require('../src/task'),
	TaskRunner = require('../src/task-runner'),
	RunContext = require('../src/run-context'),
	Logger = require('looger').Logger;

describe('TaskRunner', function() {
	function SyncTask(dependencies) {
		Task.call(this, 'foo', dependencies);
	}

	Task.extend(SyncTask, {
		exec: function(context) {}
	});

	function AsyncTask(dependencies) {
		Task.call(this, 'foo', dependencies);
	}

	Task.extend(AsyncTask, {
		exec: function(context, callback) {
			callback();
		}
	});

	it('should require a context', function() {
		(function() { new TaskRunner(); }).should.throwError('context must be an instance of RunContext');
	});

	it('should require context to be instance of RunContext', function() {
		(function() { new TaskRunner({}); }).should.throwError('context must be an instance of RunContext');
	});

	it('should have initial state be idle', function() {
		var runner = new TaskRunner(new RunContext(Logger.noop));
		runner.should.have.property('state', TaskRunner.state.idle);
	});

	it('should not allow running a task twice with the same TaskRunner', function(done) {
		var task = new SyncTask(),
			exec = sinon.spy(task, 'exec'),
			runner = new TaskRunner(new RunContext(Logger.noop));

		runner.run(task, function(err) {
			should.not.exist(err);
			runner.run(task, function(err) {
				should.exist(err);
				err.should.have.property('message', 'Cannot run task again with the same runner');
				done();
			});
		});
	});

	it('should run synchronous task with no dependent tasks', function(done) {
		var task = new SyncTask(),
			exec = sinon.spy(task, 'exec'),
			runner = new TaskRunner(new RunContext(Logger.noop));

		runner.run(task, function(err) {
			should.not.exist(err);
			runner.state.should.equal(TaskRunner.state.succeeded);
			exec.should.have.property('callCount', 1);
			done();
		});
	});

	it('should run asynchronous task with no dependent tasks', function(done) {
		var task = new AsyncTask(),
			spy = sinon.spy(task, 'exec'),
			runner = new TaskRunner(new RunContext(Logger.noop));

		runner.run(task, function(err) {
			should.not.exist(err);
			runner.state.should.equal(TaskRunner.state.succeeded);
			spy.should.have.property('calledOnce', true);
			done();
		});
	});

	it('should run synchronous task with dependent tasks', function(done) {
		var childTask = new SyncTask(),
			task = new SyncTask([ childTask ]),
			exec = sinon.spy(task, 'exec'),
			childExec = sinon.spy(childTask, 'exec'),
			runner = new TaskRunner(new RunContext(Logger.noop));

		runner.run(task, function(err) {
			should.not.exist(err);
			runner.state.should.equal(TaskRunner.state.succeeded);
			exec.should.have.property('callCount', 1);
			childExec.should.have.property('callCount', 1);
			done();
		});
	});

	it('should run synchronous task that throws and set correct state', function(done) {
		var task = new SyncTask(),
			exec = sinon.stub(task, 'exec').throws(new Error('lolz')),
			runner = new TaskRunner(new RunContext(Logger.noop));

		runner.run(task, function(err) {
			should.exist(err);
			err.should.have.property('message', 'lolz');
			runner.state.should.equal(TaskRunner.state.erred);
			exec.should.have.property('callCount', 1);
			done();
		});
	});

	it('should properly handle errors from dependent tasks', function(done) {
		var childTask = new SyncTask(),
			childExec = sinon.stub(childTask, 'exec').throws(new Error('lolz')),
			task = new SyncTask([ childTask ]),
			exec = sinon.spy(task, 'exec'),
			runner = new TaskRunner(new RunContext(Logger.noop));

		runner.run(task, function(err) {
			should.exist(err);
			err.should.have.property('message', 'lolz');
			runner.state.should.equal(TaskRunner.state.erred);
			childExec.should.have.property('calledOnce', true);
			exec.should.have.property('callCount', 0);
			done();
		});
	});

	it('should run asynchronous task that errs and set correct state', function(done) {
		var task = new AsyncTask(),
			exec = sinon.stub(task, 'exec').yields(new Error('lolz')),
			runner = new TaskRunner(new RunContext(Logger.noop));

		runner.run(task, function(err) {
			should.exist(err);
			err.should.have.property('message', 'lolz');
			runner.state.should.equal(TaskRunner.state.erred);
			exec.should.have.property('calledOnce', true);
			done();
		});
	});

	it('should run synchronous task with dependent asynchronous tasks', function(done) {
		var childTask = new AsyncTask(),
			task = new SyncTask([ childTask ]),
			childExec = sinon.spy(childTask, 'exec'),
			exec = sinon.spy(task, 'exec'),
			runner = new TaskRunner(new RunContext(Logger.noop));

		runner.run(task, function(err) {
			should.not.exist(err);
			runner.state.should.equal(TaskRunner.state.succeeded);
			exec.should.have.property('callCount', 1);
			childExec.should.have.property('callCount', 1);
			done();
		});
	});

	it('should run asynchronous task with dependent tasks', function(done) {
		var childTask = new AsyncTask(),
			task = new AsyncTask([ childTask ]),
			exec = sinon.spy(task, 'exec'),
			childExec = sinon.spy(childTask, 'exec'),
			runner = new TaskRunner(new RunContext(Logger.noop));

		runner.run(task, function(err) {
			should.not.exist(err);
			runner.state.should.equal(TaskRunner.state.succeeded);
			exec.should.have.property('calledOnce', true);
			childExec.should.have.property('calledOnce', true);
			done();
		});
	});

	it('should run nested dependent tasks in the correct order', function(done) {
		var grandchild1Task = new SyncTask(),
			grandchild2Task = new SyncTask(),
			childTask = new SyncTask([ grandchild1Task, grandchild2Task ]),
			task = new SyncTask([ childTask ]),
			exec = sinon.spy(task, 'exec'),
			childExec = sinon.spy(childTask, 'exec'),
			granchild1Exec = sinon.spy(grandchild1Task, 'exec'),
			grandchild2Exec = sinon.spy(grandchild2Task, 'exec'),
			runner = new TaskRunner(new RunContext(Logger.noop));

		runner.run(task, function(err) {
			should.not.exist(err);
			runner.state.should.equal(TaskRunner.state.succeeded);
			exec.should.have.property('calledOnce', true);
			childExec.should.have.property('calledOnce', true);
			granchild1Exec.should.have.property('calledOnce', true);
			grandchild2Exec.should.have.property('calledOnce', true);

			granchild1Exec.calledBefore(grandchild2Exec).should.equal(true);
			granchild1Exec.calledBefore(childExec).should.equal(true);
			childExec.calledBefore(exec).should.equal(true);
			done();
		});
	});
});
