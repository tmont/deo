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
					dependencies: [ 'hello', 'shell:foo', 'shell:bar' ],
					command: 'node_modules/.bin/mocha',
					args: [ '-R', 'dot', '--recursive', '${dirs.test}' ]
				},
				hello: {
					alias: 'hello',
					dependencies: [ 'shell:bar', 'shell:time' ],
					command: 'echo Hello $(whoami)'
				},
				time: {
					command: 'echo',
					dependencies: [ 'shell:foo' ],
					args: [ '${datetimeTz}' ]
				},
				foo: {
					command: 'echo foo'
				},
				bar: {
					command: 'echo bar',
					dependencies: [ 'shell:time' ]
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
