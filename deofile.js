module.exports = function(deo) {
	deo
		.set('cwd', __dirname)
		.properties({
			dirs: {
				build: 'build',
				buildStatic: '${dirs.build}/static',
				test: 'tests'
			}
		})
		.targets({
			//less: {
			//	target1: {
			//		dependsOn: [ 'init' ],
			//		src: [
			//			'src/static/css/styles.less',
			//			'src/static/css/others.less'
			//		],
			//		dest: 'build/static/css'
			//	}
			//},
			shell: {
				//nodeApp: {
				//	command: 'node',
				//	args: ['--harmony', 'src/www/app.js']
				//},
				test: {
					alias: 'test',
					command: 'node_modules/.bin/mocha',
					args: [ '-R', 'dot', '--recursive', '${dirs.test}' ]
				}
			}
			//watch: {
			//	all: {
			//		src: [
			//			'src/www',
			//			'src/static'
			//		],
			//		handlers: {
			//			less: {
			//				regex: /\.less$/,
			//				onMatch: function(files) {
			//					deo.runTarget('less:target1');
			//				}
			//			},
			//			images: {
			//				regex: /static\/(images|fonts)\//,
			//				onMatch: function(files) {
			//					deo.runTarget('copy:staticFiles');
			//				}
			//			},
			//			node: {
			//				regex: /src\/www\/.*\.js$/,
			//				onMatch: function(files) {
			//					deo.runTarget('shell:nodeApp');
			//				}
			//			}
			//		}
			//	}
			//}
		});
};