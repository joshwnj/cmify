'use strict'

const resolve = require('resolve')
const fs = require('fs')
const path = require('path')
const postcss = require('postcss')
const Parser = require('postcss-modules-parser')
const DepGraph = require('dependency-graph').DepGraph
const caller = require('caller')

const Values = require('postcss-modules-values')
const ExtractImports = require('postcss-modules-extract-imports')
const LocalByDefault = require('postcss-modules-local-by-default')
const Scope = require('postcss-modules-scope')

const defaultPlugins = [
  Values,
  LocalByDefault,
  ExtractImports,
  Scope
]

let plugins = []

let _baseDir
let _resultCache
let _depGraph


function generateScopedName() {
  // only use the relevant part of the filename
  Scope.generateScopedName = (function () {
    const orig = Scope.generateScopedName
    return function (exportedName, filename) {
      const relFilename = path.relative(_baseDir, filename)
      return orig(exportedName, relFilename)
    }
  })()
}

function parseCss (css, filename, visited) {
  const parentId = filename
  const cachedResult = getResultById(filename)
  if (cachedResult) {
    return cachedResult
  }

  const parser = new Parser({ fetch: fetch })
  const instance = postcss(plugins.concat(parser))

  function fetch (_to, from) {
    const to = _to.replace(/^["']|["']$/g, '')
    const filename = /\w/i.test(to[0])
          ? resolve.sync(to, {packageFilter: mapStyleEntry})
          : path.resolve(path.dirname(from), to)

    const css = fs.readFileSync(filename, 'utf8')
    return subCmify(css, filename, parentId, visited)
  }

  const lazyResult = instance.process(css, { from: filename })
  lazyResult.warnings().forEach(function (w) { console.warn(w.text) })

  const tokens = lazyResult.root.tokens

  return {
    tokens: tokens,
    css: lazyResult.root.toString()
  }
}

function mapStyleEntry (pkg) {
  if (!pkg.main && pkg.style) { pkg.main = pkg.style }
  return pkg
}

function getResultById (id) {
  return _resultCache[id]
}

function storeResultById (id, result) {
  if (_resultCache[id]) {
    console.warn('Overwriting cache for ', id, result)
  }
  _resultCache[id] = result
}

cmify.invalidateById = function invalidateById (id) {
  delete _resultCache[id]
}

cmify.getDependencies = function getDependencies () {
  return _depGraph.overallOrder()
}

cmify.getCssById = function getCssById (id) {
  return getResultById(id).css
}

cmify.getAllCss = function getAllCss () {
  return cmify.getDependencies()
    .map(cmify.getCssById)
    .join('\n')
}

function subCmify (css, filename, parentId, visited) {
  const mod = cmify(css, filename, visited)
  _depGraph.addDependency(parentId, mod._id)
  return mod
}

function cmify (css, filename, visited) {
  // initialize the first time we run
  if (!plugins.length) {
    cmify.init()
  }

  visited = visited || []

  if (!filename) { filename = caller() }

  const id = filename
  const cachedResult = getResultById(id)
  if (cachedResult) {
    return cachedResult.tokens
  }

  // make sure we have a node in the graph
  _depGraph.addNode(id)

  // keep track of which modules have been visited in a dependency branch
  if (visited.indexOf(id) !== -1) {
    const err = new Error('Circular dependency: \n- ' + visited.concat(id).join('\n- '))
    throw err
  }
  visited.push(id)

  const result = parseCss(css, filename, visited)

  result.tokens._id = id
  result.tokens._deps = _depGraph.dependenciesOf(id)

  storeResultById(id, result)

  return result.tokens
}

// load a css module
cmify.load = function load (filename) {
  var fullPath = path.resolve(path.dirname(caller()), filename)
  return cmify(fs.readFileSync(fullPath, 'utf8'), fullPath)
}

cmify.reset = function reset () {
  _baseDir = process.cwd()
  _resultCache = {}
  _depGraph = new DepGraph()
}

cmify.setBaseDir = function (baseDir) {
  _baseDir = baseDir
}

cmify.init = function init (opts) {
  opts = opts || {}

  if (opts.generateScopedName instanceof Function) {
    Scope.generateScopedName = (function () {
      const orig = Scope.generateScopedName
      return opts.generateScopedName(orig)
    })()
  } else {
    generateScopedName()
  }

  plugins = []
    .concat(opts.cssBefore || [])
    .concat(defaultPlugins)
    .concat(opts.cssAfter || [])
}

// reset once to begin
cmify.reset()

module.exports = cmify
