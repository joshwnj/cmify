cmify (aka node-css-modules)
====

[![Build Status](https://api.travis-ci.org/joshwnj/cmify.svg)](https://travis-ci.org/joshwnj/cmify)

A node-first approach to [CSS Modules](https://github.com/css-modules/css-modules), so you can use CSS Modules on the server without any extra tools.

Example
----

```js
var cmify = require('cmify')
var styles = cmify.load('./styles.css')

console.log('Generated classnames:', styles)
console.log('Generated CSS:', cmify.getAllCss())
```

For a complete example take a look at [cmify-example](https://github.com/joshwnj/cmify-example)

Building for the browser
----

With browserify:

```
npm install -D browserify

browserify -p cmify/plugin -t cmify/transform src/index.js
```

With hot module reloading:

```
npm install -D watchify browserify-hmr

watchify -p browserify-hmr -p cmify/plugin -t cmify/transform src/index.js -o dist/index.js
```

With babelify:

```
npm install -D babelify

browserify -p cmify/plugin -t babelify -t cmify/transform src/index.js
```

_Note: Order of transformations is important; we must babelify before cmify._

How to add postcss plugins
----

You can add postcss plugins before or after the core CSS Modules transformation:

```
const cmify = require('cmify')

cmify.init({
  cssBefore: [ /* array of postcss plugins */ ]
  cssAfter:  [ /* array of postcss plugins */ ]
})
```

`cmify.init` is optional. It should only be called once, and needs to be called before the first `cmify.load`.

Thanks
----

to the [CSS Modules team](https://github.com/orgs/css-modules/people)

License
----

MIT
