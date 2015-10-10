#!/usr/bin/env node

var start = Date.now(),
	async = require('async'),
	fs = require('fs'),
	path = require('path'),
	program = require('commander'),
	chalk = require('chalk'),
	Logger = require('looger').Logger,
	spawn = require('child_process').spawn;

program
	.version(require('../package.json').version)
	.usage('[options] task1 [task2]...')
	.option('--debug', 'Enable debug logging')
	.option('--forever', 'Do not exit the process unless an error occurs');

program.on('--help', function() {
	console.log('  Available tasks:');
	console.log();

	var taskDir = path.join(__dirname, 'tasks');
	var files = fs.readdirSync(taskDir);
	var longestName = 0;
	files.forEach(function(filename) {
		longestName = Math.max(longestName, filename.length - 3);
	});

	files.forEach(function(filename) {
		var taskName = filename.replace(/\.js$/, '');
		var fullPath = path.join(taskDir, filename);
		console.log('    ' +
			chalk.bold.underline(taskName) +
			new Array(longestName - taskName.length + 2).join(' ') +
			require(fullPath).description
		);
	});

	process.exit();
});

program.parse(process.argv);

var tasks = program.args;
var log = Logger.create({
	level: program.debug ? 'debug' : 'info',
	timestamps: false,
	colorize: true,
	prefix: chalk.blue('[deo]') + ' '
});

if (!tasks || !tasks.length) {
	log.error('At least one task must be specified');
	process.exit(1);
}

var src = path.join(__dirname, 'src'),
	testDir = path.join(__dirname, 'tests'),
	buildDirName = 'build',
	buildStaticDirName = 'static',
	staticDir = path.join(src, 'static');
var context = {
	program: program,
	staticBasePath: program.staticBasePath || '/' + buildDirName + '/' + buildStaticDirName,
	dirs: {
		src: src,
		js: path.join(staticDir, 'js'),
		less: path.join(staticDir, 'css'),
		fonts: path.join(staticDir, 'fonts'),
		images: path.join(staticDir, 'images'),
		build: path.join(__dirname, buildDirName),
		scripts: path.join(__dirname, 'scripts'),
		nodeModules: path.join(__dirname, 'node_modules'),
		tests: testDir,
		unitTests: path.join(testDir, 'unit'),
		dbTests: path.join(testDir, 'db')
	},
	spawn: function(command, args, done) {
		spawn(command, args, {stdio: [0, 1, 2]})
			.on('close', function(code) {
				done(code && code !== 0 ? code : null);
			});
	}
};

context.dirs.buildStatic = path.join(context.dirs.build, buildStaticDirName);
context.dirs.buildJs = path.join(context.dirs.buildStatic, 'js');
context.dirs.buildCss = path.join(context.dirs.buildStatic, 'css');
context.dirs.buildFonts = path.join(context.dirs.buildStatic, 'fonts');
context.dirs.buildImages = path.join(context.dirs.buildStatic, 'images');

function runTask(taskName, next) {
	log.info(chalk.underline.bold('Starting task ' + taskName));
	var task = require('./tasks/' + taskName),
		taskLog = Logger.create({
			level: program.debug ? 'debug' : 'info',
			timestamps: false,
			colorize: true,
			prefix: chalk.magenta('[' + taskName + ']') + ' '
		});

	if (task.length === 3) {
		log.debug('Arity = 3, Running task asynchronously');
		task(taskLog, context, next);
	} else {
		log.debug('Running task synchronously');
		task(taskLog, context);
		next();
	}
}

context.runTask = runTask;

async.eachSeries(tasks, runTask, function(err) {
	log.info('All tasks completed in ' + Math.round((Date.now() - start) / 100) / 10 + 's');

	if (err) {
		log.error(err);
		process.exit(1);
	}

	if (!program.forever) {
		process.exit();
	} else {
		log.debug('Running forever, CTRL+C to quit');
	}
});
