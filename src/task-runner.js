var async = require('async'),
	RunContext = require('./run-context');

function TaskRunner(context) {
	if (!context || !(context instanceof RunContext)) {
		throw new Error('context must be an instance of RunContext');
	}

	this.context = context;
	this.log = this.context.log;
	this.setState(TaskRunner.state.idle);
}

TaskRunner.prototype = {
	setState: function(state) {
		this.state = state;
		switch (state) {
			case TaskRunner.state.running:
				this.context.started = new Date();
				break;
			case TaskRunner.state.erred:
			case TaskRunner.state.succeeded:
				this.context.ended = new Date();
				break;
		}
	},

	run: function(task, callback) {
		if (this.state !== TaskRunner.state.idle) {
			callback(new Error('Cannot run task again with the same runner'));
			return;
		}

		var self = this;
		this.setState(TaskRunner.state.running);

		function runDependentTask(task, next) {
			new TaskRunner(self.context.createChildContext()).run(task, next);
		}

		async.eachSeries(task.dependentTasks, runDependentTask, function(err) {
			function finish(err) {
				if (err) {
					self.setState(TaskRunner.state.erred);
					callback(err);
					return;
				}

				self.setState(TaskRunner.state.succeeded);
				callback();
			}

			if (err) {
				finish(err);
				return;
			}

			if (task.isAsync()) {
				task.exec(self.context, function(err) {
					if (err) {
						finish(err);
						return;
					}

					finish();
				});
			} else {
				try {
					task.exec(self.context);
				} catch (err) {
					finish(err);
					return;
				}

				finish();
			}
		});
	}
};

TaskRunner.state = {
	get idle() {
		return 'idle';
	},
	get running() {
		return 'running';
	},
	get erred() {
		return 'erred';
	},
	get succeeded() {
		return 'succeeded';
	}
};

module.exports = TaskRunner;
