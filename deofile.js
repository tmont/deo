module.exports = function(deo) {
	deo
		.setProperty({
			dirs: {
				build: 'build',
				test: 'tests'
			}
		})
		.targets({
			shell: {
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