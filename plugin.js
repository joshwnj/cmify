'use strict'

const cmify = require('./index')
const through = require('through2')
const falafel = require('falafel')
const str = require('string-to-stream')
const mkdirp = require('mkdirp')
const path = require('path')
const fs = require('fs')

function createCmStream () {
  // fake module
  const cmStream = str('module.exports=null')

  // give the stream a filename so browserify can treat it as a real module
  cmStream.file = __dirname
  cmStream.id = 'cmify'

  return cmStream
}

function createCmifySource () {
  return `
function cmify () {}
cmify.getAllCss = function () { return ${JSON.stringify(cmify.getAllCss())} }
module.exports = cmify`
}

function createCssModuleSource (filename) {
  const tokens = cmify.load(filename)

  // make sure all dependencies are added to browserify's tree
  const output = tokens._deps.map(function (f) {
    return 'require("' + f + '")'
  })

  // export the css module's tokens
  output.push(`/** last updated: ${Date.now()} **/`)
  output.push(`module.exports=${JSON.stringify(tokens)}`)
  return output.join('\n')
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
      try {
        this.push(createCssModuleSource(filename))
      }
      catch (err) {
        this.emit("error", err);
      }
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
  b.require(cmStream, { expose: cmStream.id })

  b.transform(cmifyTransform)

  b.on('reset', reset)
  reset()

  function reset () {
    // add the cmify module
    b.pipeline.get('deps').push(through.obj(function write (row, enc, next) {
      if (row.id === cmStream.id) {
        next(null)
      } else {
        // css modules need to be regenerated at this point
        // (so that imported @value updates are carried through hmr)
        if (/\.css$/.test(row.id)) {
          cmify.invalidateById(row.id)
          try {
            row.source = createCssModuleSource(row.id)
          }
          catch (err) {
            this.emit("error", err);
          }
        }
        next(null, row)
      }
    }, function end (done) {

      const outFile = opts.o || opts.outfile

      if (outFile) {
        try {
          mkdirp.sync(path.dirname(outFile))
          fs.writeFileSync(outFile, cmify.getAllCss())
        } catch (err) {
          this.emit("error", err)
        }
      }

      const row = {
        id: cmStream.id,
        source: createCmifySource(),
        deps: {},
        file: cmStream.file
      }
      this.push(row)

      done()
    }))
  }

  b.on('update', function (files) {
    // invalidate cache of any changed css modules
    files.forEach(cmify.invalidateById.bind(cmify))
  })
}

module.exports = cmifyPlugin
