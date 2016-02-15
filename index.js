'use strict';
var path = require('path'),
    gutil = require('gulp-util'),
    es = require('event-stream'),
    _ = require('lodash'),
    script = require('./lib/script'),
    css = require('./lib/css');

var PLUGIN_NAME = 'gulp-cmd-packer';

module.exports = function(options) {
    options = _.extend({
        alias: {},
        paths: ['sea-modules'],
        uglify: {
            beautify: true,
            comments: false
        },
        parsers: {
            '.js': script.jsParser,
            '.tpl': script.jsParser,
            '.css': css.cssParser
        }
    }, options || {});

    var _parsedCache_ = {};

    function execPack(file, cb) {
        if (file.isNull()) {
            return cb(null, file);
        }
        if (file.isStream()) {
            return cb(new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported for ' + PLUGIN_NAME));
        }

        var extname = path.extname(file.path),
            parser = options.parsers[extname];
        return parser ? parser(file, cb, options, extname, _parsedCache_) : cb(null, file);
    }

    return es.map(execPack);
};
