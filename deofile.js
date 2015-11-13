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
					dependencies: [ 'hello' ],
					command: 'node_modules/.bin/mocha',
					args: [ '-R', 'dot', '--recursive', '${dirs.test}' ]
				},
				hello: {
					alias: 'hello',
					command: 'echo Hello $(whoami)'
				},
				time: {
					command: 'echo',
					args: [ '${datetimeTz}' ]
				}
			},
			watch: {
				tests: {
					src: [ 'src', 'tests' ],
					filter: function(filename) {
						return !/(bak|tmp|test-files)/.test(filename);
					},
					handlers: {
						less: {
							regex: /.*/,
							onMatch: [ 'test' ]
						}
					}
				}
			}
		});
};
