var fresh = require('fresh-require')
var fs = require('fs')
var path = require('path')
var postcss = require('postcss')
var jss = require('jss')

var ExtractImports = require('postcss-modules-extract-imports');
var LocalByDefault = require('postcss-modules-local-by-default');
var Scope = require('postcss-modules-scope');
var Parser = require('css-modules-require-hook/dist/parser')

var preProcess = require('lodash.identity')

var plugins = [];

plugins.push(LocalByDefault);
plugins.push(ExtractImports);
plugins.push(Scope);

function removeQuotes(str) {
  return str.replace(/^["']|["']$/g, '');
}

function Loader (dir) {
  this.dir = dir
  this._tokenCache = {}
  this._sources = {}
  this._depCounter = {}
  this._importNr = 0
}

Loader.prototype.relativeToRoot = function (f) {
  return f.substr(this.dir.length + 1)
}

Loader.prototype.tokensByFile = function (f) {
  return this._tokenCache[this.relativeToRoot(f)]
}

Loader.prototype.setTokensForFile = function (tokens, f) {
  this._tokenCache[this.relativeToRoot(f)] = tokens
}

Loader.prototype.getCss = function () {
  var sources = this._sources
  return Object.keys(sources)
    .sort(this.createDepCountSorter)
    .map(function (key) { return sources[key] })
    .join('')
}

Loader.prototype.getManifest = function () {
  return this._tokenCache
}

Loader.prototype._initDepCount = function (rootRel) {
  if (!this._depCounter[rootRel]) {
    this._depCounter[rootRel] = 0
  }
}

Loader.prototype._incDepCount = function (rootRel) {
  this._initDepCount(rootRel)
  this._depCounter[rootRel] += 1
}

Loader.prototype.createDepCountSorter = function () {
  var depCounter = this._depCounter
  return function (a, b) {
    var countA = depCounter[a]
    var countB = depCounter[b]

    return countA < countB
  }
}

Loader.prototype.processCss = function (f, from, trace) {
  var newPath = removeQuotes(f)
  var filename = /\w/.test(newPath[0])
      ? require.resolve(newPath)
      : path.resolve(path.dirname(from), newPath);

  var rootRel = this.relativeToRoot(filename)

  // if this module is depended on by another, increase its counter
  // (so that it is rendered earlier in the generated css bundle)
  if (!trace) {
    this._initDepCount(rootRel)
  }
  else {
    this._incDepCount(rootRel)
  }

  trace = trace || this._importNr++

  var cssSrc = preProcess(fs.readFileSync(filename, 'utf8'), filename);

  var parser = new Parser({
    fetch: this.processCss.bind(this),
    filename: filename,
    trace: trace
  })

  var lazyResult = postcss(plugins.concat(parser))
    .process(cssSrc, { from: '/' + rootRel });

  lazyResult.warnings().forEach(function (w) { console.warn(w.text) })

  var tokens = lazyResult.root.tokens
  this.setTokensForFile(tokens, filename)
  this._sources[rootRel] = lazyResult.root.toString()

  return tokens
}

Loader.prototype.processJss = function (f, from, trace) {
  var filename = require.resolve(f)
  var raw = fresh(filename, require)
console.log('raw', raw)
  var sheet = jss.create()

  css = jss.createStyleSheet(raw, { named: false }).toString()

  var rootRel = this.relativeToRoot(filename)

  // if this module is depended on by another, increase its counter
  // (so that it is rendered earlier in the generated css bundle)
  if (!trace) {
    this._initDepCount(rootRel)
  }
  else {
    this._incDepCount(rootRel)
  }

  trace = trace || this._importNr++

  var cssSrc = preProcess(css, filename);

  var parser = new Parser({
    fetch: this.processCss.bind(this),
    filename: filename,
    trace: trace
  })

  var lazyResult = postcss(plugins.concat(parser))
    .process(cssSrc, { from: '/' + rootRel });

  lazyResult.warnings().forEach(function (w) { console.warn(w.text) })

  var tokens = lazyResult.root.tokens
  this.setTokensForFile(tokens, filename)
  this._sources[rootRel] = lazyResult.root.toString()

  return tokens
}

// ----

module.exports = function (dir, root) {
  return function (f) {
    // get an absolute path
    f = path.resolve(dir, f)

    // consult the cache
    var tokens = root.tokensByFile(f)
    if (tokens) { console.log('cached', f, tokens); return tokens }

    var css
    var result
    var tokens

    var ext = path.extname(f)
    switch (ext) {
    case '.css':
      tokens = root.processCss(f, dir)
      break

    case '.js':
      tokens = root.processJss(f, dir)
      break
    }

    return tokens
  }
}

module.exports.Loader = Loader
