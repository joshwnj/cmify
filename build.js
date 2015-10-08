var async = require('async')
var glob = require('glob')
var path = require('path')
var loader = require('./loader')

function build (opts, cb) {
  var dir = opts.dir

  var root = new loader.Loader(dir)
  var load = loader(dir, root)

  function loadFile (filename, cb) {
    return cb(null, load(filename))
  }

  glob(opts.pattern, { cwd: dir }, function (err, files) {
    if (err) { return cb(err) }

    async.map(files, loadFile, function (err, res) {
      if (err) { return cb(err) }

      return cb(null, {
        tokens: root.getManifest(),
        css: root.getCss()
      })
    })
  })
}

build.sync = function (opts) {
  var dir = opts.dir

  var root = new loader.Loader(dir)
  var load = loader(dir, root)

  var files = glob.sync(opts.pattern, { cwd: dir });
  files.forEach(load)
  return {
    tokens: root.getManifest(),
    css: root.getCss()
  }
}

build.createFakeModule = function (res) {
  return `
  var path = require('path')
  var _rootDir
  var tokens = ${JSON.stringify(res.tokens)}
  var css = ${JSON.stringify(res.css)}

  window.tokens = tokens

  function relativeToRoot (f) {
    return f.substr(_rootDir.length + 1)
  }

  function load (f, dir) {
    f = path.resolve(dir, f)
    var rootRel = relativeToRoot(f)

    var t = tokens[rootRel]
    if (!t) {
      console.error('no tokens for file: %s', rootRel, tokens);
      return {}
    }
    return t
  }

  module.exports = function (dir) {
    return function (f) {
      return load(f, dir)
    }
  }
  module.exports.init = function (dir) {
    _rootDir = dir
    return {
      getCss: function () { return css },
      getManifest: function () { return tokens }
    }
  }
  `
}


module.exports = build
