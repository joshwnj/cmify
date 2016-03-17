const path = require('path')

module.exports = {
  styles: {
    money: '100%',
    cashMoney: '50%',
    sky: '_tests_cases_03_values_styles__sky',
    grass: '_tests_cases_03_values_styles__grass _tests_cases_03_values_things__plants',
    _id: path.join(__dirname, 'styles.css'),
    _deps: [
      path.join(__dirname, 'things.css')
    ]
  }
}
