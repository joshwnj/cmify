cmify (aka node-css-modules)
====

A node-first approach to CSS Modules, so you can use CSS Modules on the server without any extra tools.

Example
----

```js
var cmify = require('cmify')
var styles = cmify.load('./styles.css')

console.log('Generated classnames:', styles)
console.log('Generated CSS:', cmify.getAllCss())
```

Building for the browser
----

With browserify:

```
npm install -D browserify

browserify -p cmify/plugin src/index.js
```

With hot module reloading:

```
npm install -D watchify browserify-hmr

watchify -p browserify-hmr -p cmify/plugin src/index.js -o dist/index.js
```

License
----

MIT
