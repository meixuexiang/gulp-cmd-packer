'use strict';
var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    _ = require('lodash'),
    ast = require('cmd-util').ast,
    iduri = require('cmd-util').iduri,
    gutil = require('gulp-util');


exports.jsParser = function(file, cb, options, extname, _parsedCache_) {
    var isTpl = extname === '.tpl';

    var meta = isTpl ? getTplMeta(file.cwd, file.path, options, _parsedCache_) : getJsMeta(file.cwd, file.path, options, _parsedCache_);

    if (meta) {
        file.cmd = true;
        file.contents = new Buffer(meta.contents.join('\n'));
        isTpl && (file.path += '.js');
    }

    return cb(null, file);
};

function getTplMeta(cwd, fpath, options, _parsedCache_) {
    if (hasVar(fpath)) {
        return;
    }
    var id = unixy(path.relative(cwd, fpath).replace(/\.js$/, ''));

    if (_parsedCache_[id] !== void(0) && _parsedCache_[id] !== false) {
        return _parsedCache_[id];
    }

    var data = util.format('define("%s", [], "%s")', id, fs.readFileSync(fpath, 'utf8').trim().replace(/>\s*\r?\n\s*</g, '><').replace(/\s*\r?\n\s*/g, ' ').replace(/\"/g, '\\\"'));
    data = ast.getAst(data).print_to_string(options.uglify);

    return _parsedCache_[id] = {
        id: id,
        dependencies: [],
        contents: [data]
    };
}

function getJsMeta(cwd, fpath, options, _parsedCache_) {
    if (hasVar(fpath)) {
        return;
    }
    var id = unixy(path.relative(cwd, fpath).replace(/\.js$/, ''));
    // ~id.indexOf('page/js/index/index') && console.log('   isRelative: ' + id + ' ' + !!_parsedCache_[id]);
    if (_parsedCache_[id] !== void(0) && _parsedCache_[id] !== false) {
        return _parsedCache_[id];
    }

    if (!fs.existsSync(fpath)) {
        return;
    }
    var data = fs.readFileSync(fpath, 'utf8'),
        astCache;
    try {
        astCache = ast.getAst(data);
    } catch (e) {
        gutil.log('js parse error ', fpath);
        _parsedCache_[id] = false;
        return;
    }

    var meta = ast.parseFirst(astCache),
        contents = [],
        deps, depsSepecified;
    if (!meta) {
        if (data.trim()) {
            gutil.log('not cmd module ', fpath);
        } else {
            gutil.log('find empty file ', fpath);
        }
        _parsedCache_[id] = false;
        return;
    }

    if (meta.dependencyNode) {
        deps = meta.dependencies;
        depsSepecified = true;
    } else {
        deps = parseDependencies(fpath, options);
    }
    id = meta.id ? meta.id : id;
    // console.log('Dependencies: [' + id + '] ' + deps);
    deps = _.uniq(_.flattenDeep(deps.map(function(dep) {
        var oriDep = dep,
            isRela = oriDep.charAt(0) === '.';
        if (!isRela) {
            dep = iduri.parseAlias(options, dep);
        }
        while (dep.slice(-1) === '#') {
            dep = dep.slice(0, -1);
        }

        if (path.extname(dep) !== '\.css') {
            var depPath = id2path(dep, options, fpath);
            if (!depPath) {
                if (hasVar(oriDep)) {
                    return oriDep;
                }
                gutil.log('   Wrong dep: ' + oriDep + '\n        in: ' + fpath);
                return;
            }
            var isTpl = /\.tpl$/.test(dep),
                meta = isTpl ? getTplMeta(cwd, depPath, options, _parsedCache_) : getJsMeta(cwd, depPath, options, _parsedCache_);
            if (meta) {
                // ~id.indexOf('page/js/index/index') && console.log('Should concat: ' + isRela );
                if (isRela) {
                    contents = contents.concat(meta.contents);
                }
                return meta.dependencies.concat([dep]).map(function(d) {
                    return d.charAt(0) === '.' ? unixy(path.relative(cwd, path.resolve(path.dirname(fpath), d))) : d;
                });
            }
        }
        return dep;
    }).filter(function(dep) {
        return !!dep;
    })));

    // console.log('Dependencies: {' + id + '} ' + deps);

    astCache = ast.modify(astCache, {
        id: id,
        dependencies: deps,
        require: function(v) {
            return depsSepecified ? v : iduri.parseAlias(options, v);
        }
    });

    data = astCache.print_to_string(options.uglify);
    contents.push(data);

    return _parsedCache_[id] = {
        id: id,
        dependencies: deps,
        contents: _.uniq(contents)
    };
}

function id2path(id, options, fpath) {
    if (id.charAt(0) === '.') {
        id = path.join(path.dirname(fpath), id);
        id = appendext(id);
    } else {
        id = appendext(id);
        var fullpath;
        options.paths.some(function(base) {
            var filepath = path.join(base, id);
            if (fs.existsSync(filepath)) {
                fullpath = filepath;
                return true;
            }
        });
        if (!fullpath) {
            return;
        }
        id = fullpath;
    }
    return unixy(id);
}

function hasVar(id) {
    return !!~String(id).indexOf('{');
}

function appendext(uri) {
    return /\.tpl$/.test(uri) ? uri : !/\.js$/.test(uri) ? uri + '.js' : uri;
}

function unixy(uri) {
    return uri.replace(/\\/g, '/');
}

function parseDependencies(fpath, options) {
    var rootpath = fpath;

    function relativeDependencies(fpath, options, basefile) {
        if (basefile) fpath = path.join(path.dirname(basefile), fpath);
        fpath = appendext(fpath);

        //do not parse none js files
        if (!/\.js$/.test(fpath)) return [];

        var deps = [],
            moduleDeps = {};

        if (!fs.existsSync(fpath)) {
            gutil.log("can't find " + fpath);
            return [];
        }

        var parsed,
            data = fs.readFileSync(fpath, 'utf8');

        try {
            parsed = ast.parseFirst(data);
        } catch (e) {
            gutil.log(e.message + ' [ line:' + e.line + ', col:' + e.col + ', pos:' + e.pos + ' ]');
            return [];
        }
        return parsed.dependencies.map(function(id) {
            return id.replace(/\.js$/, '');
        });
        return deps;
    }

    return relativeDependencies(fpath, options);
}
