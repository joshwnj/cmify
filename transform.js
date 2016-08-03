'use strict'

const falafel = require('falafel')
const through = require('through2')
const createCssModuleSource = require('./create-css-module-source')

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

module.exports = cmifyTransform
