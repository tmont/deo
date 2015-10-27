module.exports = {
	watch: require('./dev/watch'),
	copy: require('./fs/copy'),
	delete: require('./fs/delete'),
	shell: require('./misc/shell'),
	browserify: require('./web/browserify'),
	less: require('./web/less')
};
