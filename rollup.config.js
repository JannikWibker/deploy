import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

export default {
  input: "src/main.js",
  output: {
    file: "client/bundle.js",
    format: "umd",
    sourceMap: "inline"
  },
  plugins: [
    resolve({jsnext: true, main: true, browser: true, }),
    babel({
      "exclude": "node_modules/**",
      "presets": [["env", { "modules": false }]],
      "plugins": [
        "external-helpers",
        "transform-object-rest-spread",
        "transform-export-extensions",
      ]
    }),
    commonjs({include: 'node_modules/**'}),
  ]
}
