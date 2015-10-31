var Task = require('../../task'),
	chalk = require('chalk'),
	extend = require('extend'),
	path = require('path'),
	async = require('async'),
	fs = require('fs-extra'),
	childProcess = require('child_process'),
	spawn = childProcess.spawn,
	exec = childProcess.exec;

function ShellTask(options) {
	options = options || {};

	if (!options.command) {
		throw new Error('Must specify a command');
	}

	Task.call(this, options.alias || 'shell', [], {
		command: options.command || null,
		args: options.args || null,
		cwd: options.cwd || null,
		env: options.env,
		forever: !!options.forever,
		killSignal: options.killSignal || 'SIGKILL'
	});
}

Task.extend(ShellTask, {
	runForever: function() {
		return !!this.options.forever;
	},

	dispose: function(context, callback) {
		var proc = context.get('proc');

		if (!proc || proc.exitCode !== null) {
			if (proc.exitCode !== null) {
				context.log.trace('Not killing process, exitCode is defined');
			}
			callback();
			return;
		}

		context.log.info('Killing running process using signal ' + chalk.magenta(this.options.killSignal));
		proc.kill(this.options.killSignal);
		callback();
	},

	exec: function(context, callback) {
		var args = this.options.args,
			command = this.options.command;

		var options = {};
		if (this.options.cwd) {
			options.cwd = this.options.cwd;
		}
		if (this.options.env) {
			options.env = this.options.env;
		}

		context.log.debug('Command: ' + chalk.gray(command + ' ' + args.join(' ')));

		var forever = !!this.options.forever;

		var proc;
		if (!args) {
			proc = exec(command, options, function(err, stdout, stderr) {
				if (stdout) {
					context.log.info(stdout);
				}
				if (stderr) {
					context.log.warn(stderr);
				}

				if (forever) {
					context.log.warn('Shell command finished, but is supposed to run continuously');
					if (err) {
						context.log.error(err);
					}
					return;
				}

				callback(err);
			});
		} else {
			options.stdio = 'inherit';
			proc = spawn(this.options.command, this.options.args, options);
			proc.on('error', function(err) {
				context.log.error(err);
				if (!forever) {
					callback(err);
				}
			});
			proc.on('stdout', function(data) {
				context.log.info(data);
			});
			proc.on('stderr', function(data) {
				context.log.warn(data);
			});
			proc.on('close', function(code) {
				context.log.debug('Child process finished with code ' + chalk.bold(code));
				if (!forever) {
					if (code !== 0) {
						callback(new Error('Received exit code ' + code));
						return;
					}

					callback();
				}
			});
		}

		context.set('proc', proc);
		if (forever) {
			callback();
		}
	}
});

module.exports = ShellTask;
