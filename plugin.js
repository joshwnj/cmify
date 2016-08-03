'use strict'

const cmify = require('./index')
const through = require('through2')
const str = require('string-to-stream')
const createCssModuleSource = require('./create-css-module-source')

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

function cmifyPlugin (b, opts) {
  opts = opts || {}

  cmify.init({
    cssBefore: opts.cssBefore,
    cssAfter: opts.cssAfter
  })

  // register a fake cmify module for the browser
  const cmStream = createCmStream()
  b.require(cmStream, { expose: cmStream.id })

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
