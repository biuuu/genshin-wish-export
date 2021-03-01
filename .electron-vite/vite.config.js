const { join } = require("path")
const vuePlugin = require("@vitejs/plugin-vue")

function resolve(dir) {
    return join(__dirname, '..', dir)
}

const root = resolve('src/renderer')

const config = {
    mode: process.env.NODE_ENV,
    root,
    resolve: {
        alias: {
            '@': root,
        }
    },
    base: './',
    build: {
        outDir: process.env.BUILD_TARGET === 'web' ? resolve('dist/web') : resolve('dist/electron/renderer'),
        emptyOutDir: true
    },
    server: {
        port: Number(process.env.PORT),
    },
    plugins: [
        vuePlugin()
    ],
    publicDir: resolve('static')
}

module.exports = config