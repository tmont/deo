module.exports = function(deo, callback) {
	deo
		.cwd(__dirname)
		.properties({
			dirs: {
				build: 'build',
				buildStatic: '${dirs.build}/static'
			}
		})
		.configure({
			targets: {
				less: {
					target1: {
						src: [
							'src/static/css/styles.less',
							'src/static/css/others.less'
						],
						dest: 'build/static/css'
					}
				},
				shell: {
					nodeApp: {
						command: 'node',
						args: ['--harmony', 'src/www/app.js']
					}
				},
				watch: {
					all: {
						src: [
							'src/www',
							'src/static'
						],
						handlers: {
							less: {
								regex: /\.less$/,
								onMatch: function(files) {
									deo.runTarget('less:target1');
								}
							},
							images: {
								regex: /static\/(images|fonts)\//,
								onMatch: function(files) {
									deo.runTarget('copy:staticFiles');
								}
							},
							node: {
								regex: /src\/www\/.*\.js$/,
								onMatch: function(files) {
									deo.runTarget('shell:nodeApp');
								}
							}
						}
					}
				}
			}
		});

	callback();
};