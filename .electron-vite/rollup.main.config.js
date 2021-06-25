const path = require('path')
const { nodeResolve } = require('@rollup/plugin-node-resolve')
const commonjs = require('@rollup/plugin-commonjs')
const esbuild = require('rollup-plugin-esbuild')
const alias = require('@rollup/plugin-alias')
const json = require('@rollup/plugin-json')

module.exports = (env = 'production') => {
  return {
    input: path.join(__dirname, '../src/main/main.js'),
    output: {
      file: path.join(__dirname, '../dist/electron/main/main.js'),
      format: 'cjs',
      name: 'MainProcess',
      sourcemap: false,
    },
    plugins: [
      nodeResolve({ jsnext: true, preferBuiltins: true, browser: true }), // 消除碰到 node.js 模块时⚠警告
      commonjs(),
      json(),
      esbuild({
        // All options are optional
        include: /\.[jt]sx?$/, // default, inferred from `loaders` option
        exclude: /node_modules/, // default
        // watch: process.argv.includes('--watch'), // rollup 中有配置
        sourceMap: false, // default
        minify: process.env.NODE_ENV === 'production',
        target: 'esnext', // default, or 'es20XX', 'esnext'
        // Like @rollup/plugin-replace
        define: {
          __VERSION__: '"x.y.z"'
        },
        // Add extra loaders
        loaders: {
          // Add .json files support
          // require @rollup/plugin-commonjs
          '.json': 'json',
          // Enable JSX in .js files too
          '.js': 'jsx'
        },
      }),
      alias({
        entries: [
          { find: '@main', replacement: path.join(__dirname, '../src/main'), },
        ]
      })
    ],
    external: [
      'crypto',
      'assert',
      'fs',
      'util',
      'os',
      'events',
      'child_process',
      'http',
      'https',
      'path',
      'electron',
      'original-fs'
    ],
  }
}
