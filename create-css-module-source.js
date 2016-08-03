'use strict'

const cmify = require('./index')

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

module.exports = createCssModuleSource
