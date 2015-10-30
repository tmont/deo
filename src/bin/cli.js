#!/usr/bin/env node

var start = Date.now(),
	async = require('async'),
	fs = require('fs'),
	path = require('path'),
	program = require('commander'),
	chalk = require('chalk'),
	Logger = require('looger').Logger,
	deo = require('../../');

program
	.version(require('../../package.json').version)
	.usage('[options] task1 [task2]...')
	.option('--log <level>', 'Set log level')
	.option('-C, --config <file>', 'Path to deo configuration file, defaults to ./deofile.js');

program.parse(process.argv);

var tasks = program.args;
var log = Logger.create({
	level: program.log || 'info',
	timestamps: false,
	colorize: true,
	prefix: chalk.blue('[deo]') + ' '
});

if (!tasks.length) {
	tasks = [ 'default' ];
}

var defaultConfig = new deo.Config(log);
Object.keys(deo.tasks).forEach(function(name) {
	log.trace('Registering builtin task ' + chalk.blue(name));
	defaultConfig.registerTask(deo.tasks[name], name);
});

var d = new deo.Deo(log, defaultConfig);

function verifyConfigFile(next) {
	var configFile = program.config || path.resolve('./deofile.js');
	log.trace('Verifying config file ' + chalk.bold(configFile));
	fs.access(configFile, function(err) {
		if (err) {
			next(new Error('Configuration file "' + configFile + '" is not accessible'));
			return;
		}

		log.debug('Config file ' + chalk.bold(configFile) + ' exists');

		var configure = require(configFile);

		try {
			configure(d);
		} catch (e) {
			next(e);
			return;
		}

		next();
	});
}

function runTasks(next) {
	log.trace('Running tasks', tasks);
	function runTask(taskName, next) {
		d.runTask(taskName, next);
	}

	async.eachSeries(tasks, runTask, next);
}

async.series([ verifyConfigFile, runTasks ], function(err) {
	if (err) {
		log.error(err);
		cleanUp(err);
		return;
	}

	if (!d.isRunning()) {
		process.exit(0);
	}

	var stopping = false;

	function cleanUp(runError) {
		if (stopping) {
			return;
		}

		log.debug('Cleaning up running tasks...');
		d.kill(function(err) {
			log.debug('Clean up complete');
			if (err) {
				log.warn('Error occurred during cleanup');
				log.error(err);
			}
			process.exit(err || runError ? 1 : 0);
		});
	}

	log.info('Tasks are still running, press CTRL+C to stop');

	process.on('SIGINT', cleanUp);
});
