import babel from '@rollup/plugin-babel'
import resolve from '@rollup/plugin-node-resolve'
import cmjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import json from '@rollup/plugin-json'


const plugins = [
  cmjs({
    exclude: [
      "node_modules/electron/**"
    ],
    include: [
      'src/**',
      "node_modules/electron-fetch/**",
      "node_modules/fs-extra/**",
      "node_modules/get-stream/**",
      "node_modules/node-mitmproxy/**",
      "node_modules/semver/**",
      "node_modules/winreg/**",
      "node_modules/yauzl/**"
    ],
    sourceMap: false
  }),
  resolve({
    preferBuiltins: false,
    resolveOnly: ['electron-fetch', 'fs-extra', 'get-stream', 'node-mitmproxy', 'semver', 'winreg', 'yauzl']
  }),
  json()
]

if (!process.env.DEV) {
  // plugins.push(terser({}))
}

export default {
  input: 'src/main.js',
  plugins,
  output: {
    file: './dist/main.min.js',
    format: 'cjs',
    name: 'main',
    strict: false
  }
};
