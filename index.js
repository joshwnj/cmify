var loader = require('./loader')

var _root

module.exports = function (dir) {
  return loader(dir, _root)
}

module.exports.init = function (dir) {
  _root = new loader.Loader(dir)
  return _root
}

module.exports.build = require('./build')
