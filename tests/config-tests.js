var deo = require('../'),
	should = require('should'),
	Logger = require('looger').Logger;

describe('Config', function() {
	it('should interpolate value', function() {
		var log = Logger.noop;
		var config = new deo.Config(log);
		config.setProperty('foo', 'bar');
		config.interpolate('${foo}').should.equal('bar');
	});

	it('should interpolate builtin "datetime"', function() {
		var log = Logger.noop;
		var config = new deo.Config(log);
		config.interpolate('${datetime}').should.match(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z/);
	});

	it('should interpolate builtin "datetimeTz"', function() {
		var log = Logger.noop;
		var config = new deo.Config(log);
		config.interpolate('${datetimeTz}').should.match(/\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3}/);
	});

	it('should interpolate builtin "timestamp"', function() {
		var log = Logger.noop;
		var config = new deo.Config(log);
		config.interpolate('${timestamp}').should.match(/\d{13}/);
	});

	it('should interpolate multiple instances of the same value', function() {
		var log = Logger.noop;
		var config = new deo.Config(log);
		config.setProperty('foo', 'bar');
		config.interpolate('${foo} ${foo}').should.equal('bar bar');
	});

	it('should interpolate multiple instances of different values', function() {
		var log = Logger.noop;
		var config = new deo.Config(log);
		config.setProperty('foo', 'bar');
		config.setProperty('bar', 'baz');
		config.interpolate('${foo} ${bar}').should.equal('bar baz');
	});

	it('should interpolate value when fetching property', function() {
		var log = Logger.noop;
		var config = new deo.Config(log);
		config.setProperty('foo', 'bar');
		config.setProperty('bar', '${foo}');
		config.getProperty('bar').should.equal('bar');
	});

	it('should interpolate property that is an object', function() {
		var log = Logger.noop;
		var config = new deo.Config(log);
		config.setProperty({
			foo: {
				bar: 'baz',
				bat: {
					qux: '${foo.bar}'
				}
			}
		});

		config.getProperty('foo.bar').should.equal('baz');
		config.getProperty('foo.bat.qux').should.equal('baz');
	});
});
