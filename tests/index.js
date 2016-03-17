const fs = require('fs')
const path = require('path')
const tape = require('tape')

const casesDir = path.join(__dirname, 'cases')

fs.readdir(casesDir, function (err, dirs) {
  if (err) { throw err }

  dirs.forEach(function (dir) {
    const fullDir = path.join(casesDir, dir)
    tape(`Case: ${dir}`, function (t) {
      const result = require(fullDir)
      const expected = require(path.join(fullDir, 'expected.js'))

      t.deepEqual(result, expected, 'Tokens exported as expected')
      t.end()
    })
  })
})
