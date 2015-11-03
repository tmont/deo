var async = require('async'),
	domain = require('domain'),
	Logger = require('looger').Logger,
	chalk = require('chalk'),
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
	getName: function() {
		return this.context.task ? this.context.task.name : 'n/a';
	},

	setState: function(state) {
		this.state = state;
		switch (state) {
			case TaskRunner.state.running:
				this.log.info('Starting ' + chalk.bold.underline(this.getName()) + ' target');
				this.context.started = new Date();
				break;
			case TaskRunner.state.erred:
			case TaskRunner.state.succeeded:
				this.context.ended = new Date();
				var icon = String.fromCharCode(0x2713),
					color = 'green',
					message = 'succeeded';

				if (state !== TaskRunner.state.succeeded) {
					icon = String.fromCharCode(0x2717);
					color = 'red';
					message = 'failed';
				}

				this.log.info(
					chalk[color](icon) + ' target ' + chalk.underline(this.getName()) +
					' ' + chalk[color](message) + ' in ' + this.context.elapsedFormatted
				);

				break;
		}
	},

	dispose: function(callback) {
		var task = this.context.task;
		if (!task) {
			callback();
			return;
		}

		task.dispose(this.context, callback);
	},

	run: function(task, callback) {
		if (this.state !== TaskRunner.state.idle) {
			callback(new Error('Cannot run task again with the same runner'));
			return;
		}

		var self = this;
		this.context.task = task;
		this.context.log = new Logger(this.context.log.logger, {
			level: this.context.log.level,
			prefix: chalk.blue('[' + this.context.task.name + '] ')
		});
		this.setState(TaskRunner.state.running);

		function runDependentTask(task, next) {
			new TaskRunner(self.context.createChildContext()).run(task, next);
		}

		var disposed = false;

		async.eachSeries(task.dependentTasks, runDependentTask, function(err) {
			function finish(err) {
				if (task.runForever(self.context)) {
					callback(err);
					return;
				}

				function setStateAndCallBack() {
					if (err) {
						self.setState(TaskRunner.state.erred);
						callback(err);
						return;
					}

					self.setState(TaskRunner.state.succeeded);
					callback();
				}

				if (disposed) {
					setStateAndCallBack();
					return;
				}

				disposed = true;
				task.dispose(self.context, function() {
					d && d.exit();
					setStateAndCallBack();
				});
			}

			if (err) {
				finish(err);
				return;
			}

			var d = domain.create();
			d.on('error', function(err) {
				if (disposed) {
					finish(err);
					return;
				}

				disposed = true;
				task.dispose(self.context, function() {
					finish(err);
				});
			});

			d.run(function() {
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
