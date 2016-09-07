const path = require('path')

module.exports = {
  styles: {
    sky: '_tests_cases_04_compose_from_npm_styles__sky',
    grass: '_tests_cases_04_compose_from_npm_styles__grass _node_modules_cool_styles_styles__coolness',
    _id: path.join(__dirname, 'styles.css'),
    _deps: [
      path.resolve(path.join(__dirname, '..', '..', '..', 'node_modules', 'cool-styles', 'styles.css'))
    ]
  }
}
