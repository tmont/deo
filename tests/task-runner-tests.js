var should = require('should'),
	sinon = require('sinon'),
	Task = require('../src/task'),
	TaskRunner = require('../src/task-runner'),
	RunContext = require('../src/run-context'),
	Logger = require('looger').Logger;

describe('TaskRunner', function() {
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
		var definition = sinon.stub(),
			task = new Task('foo', definition),
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
		var definition = sinon.stub(),
			task = new Task('foo', definition),
			runner = new TaskRunner(new RunContext(Logger.noop));

		runner.run(task, function(err) {
			should.not.exist(err);
			runner.state.should.equal(TaskRunner.state.succeeded);
			definition.should.have.property('callCount', 1);
			done();
		});
	});

	it('should run asynchronous task with no dependent tasks', function(done) {
		function definition(context, callback) {
			callback();
		}

		var spy = sinon.spy(definition);
		var task = new Task('foo', spy),
			runner = new TaskRunner(new RunContext(Logger.noop));

		runner.run(task, function(err) {
			should.not.exist(err);
			runner.state.should.equal(TaskRunner.state.succeeded);
			spy.should.have.property('calledOnce', true);
			done();
		});
	});

	it('should run synchronous task with dependent tasks', function(done) {
		var definition = sinon.stub(),
			childDef = sinon.stub(),
			childTask = new Task('bar', childDef),
			task = new Task('foo', definition, [ childTask ]),
			runner = new TaskRunner(new RunContext(Logger.noop));

		runner.run(task, function(err) {
			should.not.exist(err);
			runner.state.should.equal(TaskRunner.state.succeeded);
			definition.should.have.property('callCount', 1);
			childDef.should.have.property('callCount', 1);
			done();
		});
	});

	it('should run synchronous task that throws and set correct state', function(done) {
		var definition = sinon.stub().throws(new Error('lolz')),
			task = new Task('foo', definition),
			runner = new TaskRunner(new RunContext(Logger.noop));

		runner.run(task, function(err) {
			should.exist(err);
			err.should.have.property('message', 'lolz');
			runner.state.should.equal(TaskRunner.state.erred);
			definition.should.have.property('callCount', 1);
			done();
		});
	});

	it('should properly handle errors from dependent tasks', function(done) {
		var definition = sinon.stub(),
			childDef = sinon.stub().throws(new Error('lolz')),
			childTask = new Task('bar', childDef),
			task = new Task('foo', definition, [ childTask ]),
			runner = new TaskRunner(new RunContext(Logger.noop));

		runner.run(task, function(err) {
			should.exist(err);
			err.should.have.property('message', 'lolz');
			runner.state.should.equal(TaskRunner.state.erred);
			childDef.should.have.property('calledOnce', true);
			definition.should.have.property('callCount', 0);
			done();
		});
	});

	it('should run asynchronous task that errs and set correct state', function(done) {
		function definition(context, callback) {
			callback(new Error('lolz'));
		}

		var spy = sinon.spy(definition);
		var task = new Task('foo', spy),
			runner = new TaskRunner(new RunContext(Logger.noop));

		runner.run(task, function(err) {
			should.exist(err);
			err.should.have.property('message', 'lolz');
			runner.state.should.equal(TaskRunner.state.erred);
			spy.should.have.property('calledOnce', true);
			done();
		});
	});

	it('should run synchronous task with dependent asynchronous tasks', function(done) {
		function async(context, callback) {
			callback();
		}

		var definition = sinon.stub(),
			childDef = sinon.spy(async),
			childTask = new Task('bar', childDef),
			task = new Task('foo', definition, [childTask]),
			runner = new TaskRunner(new RunContext(Logger.noop));

		runner.run(task, function(err) {
			should.not.exist(err);
			runner.state.should.equal(TaskRunner.state.succeeded);
			definition.should.have.property('callCount', 1);
			childDef.should.have.property('callCount', 1);
			done();
		});
	});

	it('should run asynchronous task with dependent tasks', function(done) {
		function async(context, callback) {
			callback();
		}

		var definition = sinon.spy(async);
		var childDef = sinon.stub(),
			childTask = new Task('bar', childDef),
			task = new Task('foo', definition, [ childTask ]),
			runner = new TaskRunner(new RunContext(Logger.noop));

		runner.run(task, function(err) {
			should.not.exist(err);
			runner.state.should.equal(TaskRunner.state.succeeded);
			definition.should.have.property('calledOnce', true);
			childDef.should.have.property('calledOnce', true);
			done();
		});
	});

	it('should run nested dependent tasks in the correct order', function(done) {
		var definition = sinon.stub(),
			childDef = sinon.stub(),
			grandchild1Def = sinon.stub(),
			grandchild2Def = sinon.stub();

		var grandchild1Task = new Task('grandchild1', grandchild1Def),
			grandchild2Task = new Task('grandchild2', grandchild2Def),
			childTask = new Task('bar', childDef, [ grandchild1Task, grandchild2Task ]),
			task = new Task('foo', definition, [ childTask ]),
			runner = new TaskRunner(new RunContext(Logger.noop));

		runner.run(task, function(err) {
			should.not.exist(err);
			runner.state.should.equal(TaskRunner.state.succeeded);
			definition.should.have.property('calledOnce', true);
			childDef.should.have.property('calledOnce', true);
			grandchild1Def.should.have.property('calledOnce', true);
			grandchild2Def.should.have.property('calledOnce', true);

			grandchild1Def.calledBefore(grandchild2Def).should.equal(true);
			grandchild1Def.calledBefore(childDef).should.equal(true);
			childDef.calledBefore(definition).should.equal(true);
			done();
		});
	});
});
