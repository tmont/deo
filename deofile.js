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
					filter: function(filename) {
						if (/(tmp|test-files)/.test(filename)) {
							return false;
						}

						return true;
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