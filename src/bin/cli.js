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
	.option('--debug', 'Shortcut for --log debug', false)
	.option('--trace', 'Shortcut for --log trace', false)
	.option('-C, --config <file>', 'Path to deo configuration file, defaults to ./deofile.js');

program.parse(process.argv);

var logLevel = program.log || (program.trace && 'trace') || (program.debug && 'debug') || 'info';
var tasks = program.args;
var log = Logger.create({
	level: logLevel,
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

var stopping = false;

function finish(err) {
	log.info('Completed in ' + deo.time.formatElapsed(Date.now() - start));
	process.exit(err ? 1 : 0);
}

function cleanUp(runError) {
	if (stopping) {
		return;
	}

	stopping = true;
	log.debug('Cleaning up running tasks...');
	d.kill(function(err) {
		log.debug('Clean up complete');
		if (err) {
			log.warn('Error occurred during cleanup');
			log.error(err);
		}
		finish(err || runError);
	});
}

process.on('SIGINT', function() {
	console.log();
	log.trace('Received SIGINT signal');
	cleanUp();
});

async.series([ verifyConfigFile, runTasks ], function(err) {
	if (err) {
		log.error(err);
		cleanUp(err);
		return;
	}

	if (!d.isRunning()) {
		finish();
		return;
	}

	log.info('Tasks are still running, press CTRL+C to stop');
});
