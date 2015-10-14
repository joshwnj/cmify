var loader = require('./loader')

var _root

function init (dir) {
  _root = new loader.Loader(dir)
  return _root
}

module.exports = function (dir) {
  dir = dir || process.cwd()
  if (!_root) { init(dir) }

  return loader(dir, _root)
}

module.exports.init = init
module.exports.getCss = function () { return _root.getCss() }
module.exports.build = require('./build')
