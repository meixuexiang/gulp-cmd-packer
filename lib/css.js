'use strict';
var path = require('path'),
    util = require('util'),
    css = require('cmd-util').css,
    iduri = require('cmd-util').iduri,
    gutil = require('gulp-util');

exports.cssParser = function(file, cb, options, extname, _parsedCache_) {
    var data = file.contents.toString('utf8'),
        filename = path.relative(file.cwd, file.path),
        id = unixy(filename.replace(/\.js$/, ''));

    data = css.parse(data);
    var ret = css.stringify(data[0].code, function(node) {
        if (node.type === 'import' && node.id) {
            if (node.id.charAt(0) === '.') {
                return node;
            }
            if (/^https?:\/\//.test(node.id)) {
                return node;
            }
            if (!iduri.isAlias(options, node.id)) {
                gutil.log('alias ' + node.id + ' not defined.');
            } else {
                node.id = iduri.parseAlias(options, node.id);
                if (!/\.css$/.test(node.id)) {
                    node.id += '.css';
                }
                return node;
            }
        }
    });

    var banner = util.format('/*! define %s */', id);
    data = [banner, ret].join('\n');
    file.contents = new Buffer(data);

    cb(null, file);
};

function unixy(uri) {
    return uri.replace(/\\/g, '/');
}
