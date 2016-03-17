const path = require('path')

module.exports = {
  styles: {
    sky: '_tests_cases_02_compose_styles__sky',
    grass: '_tests_cases_02_compose_styles__grass _tests_cases_02_compose_things__plants',
    _id: path.join(__dirname, 'styles.css'),
    _deps: [
      path.join(__dirname, 'things.css')
    ]
  }
}
