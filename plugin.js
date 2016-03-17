'use strict'

const cmify = require('./index')
const through = require('through2')
const falafel = require('falafel')
const str = require('string-to-stream')

function createCmStream () {
  // fake module
  const cmStream = str(`
function cmify () {}
cmify.getAllCss = function () { return window.__cmify_allCss }
module.exports = cmify
`)

  // give the stream a filename so browserify can treat it as a real module
  cmStream.file = __dirname

  return cmStream
}

function cmifyTransform (filename) {
  const bufs = []
  let cmifyName = null

  const stream = through(write, end)
  return stream

  // ----

  function write (buf, enc, next) {
    bufs.push(buf)
    next()
  }

  function end (done) {
    const src = Buffer.concat(bufs).toString('utf8')

    // handle css files
    if (/\.css$/.test(filename)) {
      const tokens = cmify.load(filename)

      // make sure all dependencies are added to browserify's tree
      const output = tokens._deps.map(function (f) {
        return 'require("' + f + '")'
      })

      // export the css module's tokens
      output.push(`/** last updated: ${Date.now()} **/`)
      output.push('module.exports=' + JSON.stringify(tokens))

      this.push(output.join('\n'))
    } else {
      const ast = falafel(src, { ecmaVersion: 6 }, walk)
      this.push(ast.toString())
    }

    this.push(null)
    done()
  }

  function walk (node) {
    // find `require('cmify')` and record the name it's bound to
    if (node.type === 'CallExpression' &&
        node.callee && node.callee.name === 'require' &&
        node.arguments.length === 1 &&
        node.arguments[0].value === 'cmify') {
      cmifyName = node.parent.id.name
      return
    }

    // find places where `cmify.load(...)` is called
    if (node.type === 'CallExpression' &&
        node.callee && node.callee.type === 'MemberExpression' &&
        node.callee.object.name === cmifyName &&
        node.callee.property.name === 'load'
       ) {
      // rewrite as `require`, so it gets included in the dependency tree
      node.update(`require(${node.arguments[0].raw})`)
    }
  }
}

function cmifyPlugin (b, opts) {
  opts = opts || {}

  cmify.init({
    cssBefore: opts.cssBefore,
    cssAfter: opts.cssAfter
  })

  // register a fake cmify module for the browser
  const cmStream = createCmStream()
  b.require(cmStream, { expose: 'cmify' })

  b.transform(cmifyTransform)

  b.on('reset', reset)
  reset()

  function reset () {
    const marker = '/**CMIFY**/'
    let entryRow = null

    b.pipeline.get('deps').push(through.obj(function write (row, enc, next) {
      if (!entryRow && row.deps && row.deps.cmify) {
        entryRow = row
        return next(null)
      }
      next(null, row)
    }, function end (done) {
      // entry file always gets some code prepended to it
      let src = entryRow.source
      const indexA = src.indexOf(marker)
      const indexB = src.indexOf(marker, indexA + 1)
      const insert = marker + `;\nwindow.__cmify_allCss = ${JSON.stringify(cmify.getAllCss())};` + marker

      // remove the old one before we add it again
      if (indexA !== -1 && indexB !== -1) {
        src = src.substr(0, indexA) + insert + src.substr(indexB + marker.length)
      } else {
        src = insert + src
      }

      entryRow.source = src
      this.push(entryRow)

      done()
    }))
  }

  b.on('update', function (files) {
    // invalidate cache of any changed css modules
    files.forEach(cmify.invalidateById.bind(cmify))
  })
}

module.exports = cmifyPlugin
