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
			},
			watch: {
				tests: {
					src: [ 'tests' ],
					handlers: {
						less: {
							regex: /\.js$/,
							onMatch: [ 'test' ]
						}
					}
				}
			}
		});
};