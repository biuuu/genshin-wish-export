process.env.NODE_ENV = 'development'

const chalk = require('chalk')
const electron = require('electron')
const path = require('path')
const rollup = require("rollup")
const Portfinder = require("portfinder")

const { say } = require('cfonts')
const { spawn } = require('child_process')
const { createServer } = require('vite')

const rendererOptions = require("./vite.config")
const mainOptions = require("./rollup.main.config")
const opt = mainOptions(process.env.NODE_ENV);

let electronProcess = null
let manualRestart = false

function logStats(proc, data) {
    let log = ''

    log += chalk.yellow.bold(`┏ ${proc} 'Process' ${new Array((19 - proc.length) + 1).join('-')}`)
    log += '\n\n'

    if (typeof data === 'object') {
        data.toString({
            colors: true,
            chunks: false
        }).split(/\r?\n/).forEach(line => {
            log += '  ' + line + '\n'
        })
    } else {
        log += `  ${data}\n`
    }

    log += '\n' + chalk.yellow.bold(`┗ ${new Array(28 + 1).join('-')}`) + '\n'
    console.log(log)
}

function removeJunk(chunk) {
        // Example: 2018-08-10 22:48:42.866 Electron[90311:4883863] *** WARNING: Textured window <AtomNSWindow: 0x7fb75f68a770>
        if (/\d+-\d+-\d+ \d+:\d+:\d+\.\d+ Electron(?: Helper)?\[\d+:\d+] /.test(chunk)) {
            return false;
        }

        // Example: [90789:0810/225804.894349:ERROR:CONSOLE(105)] "Uncaught (in promise) Error: Could not instantiate: ProductRegistryImpl.Registry", source: chrome-devtools://devtools/bundled/inspector.js (105)
        if (/\[\d+:\d+\/|\d+\.\d+:ERROR:CONSOLE\(\d+\)\]/.test(chunk)) {
            return false;
        }

        // Example: ALSA lib confmisc.c:767:(parse_card) cannot find card '0'
        if (/ALSA lib [a-z]+\.c:\d+:\([a-z_]+\)/.test(chunk)) {
            return false;
        }


    return chunk;
}

function startRenderer() {
    return new Promise((resolve, reject) => {
        Portfinder.basePort = 9080
        Portfinder.getPort(async (err, port) => {
            if (err) {
                reject("PortError:" + err)
            } else {
                const server = await createServer(rendererOptions)
                process.env.PORT = port
                server.listen(port).then(() => {
                    console.log('\n\n' + chalk.blue('  Preparing main process, please wait...') + '\n\n')
                })
                resolve()
            }
        })
    })
}

function startMain() {
    return new Promise((resolve, reject) => {
        const watcher = rollup.watch(opt);
        watcher.on('change', filename => {
            // 主进程日志部分
            logStats('Main-FileChange', filename)
        });
        watcher.on('event', event => {
            if (event.code === 'END') {
                if (electronProcess && electronProcess.kill) {
                    manualRestart = true
                    process.kill(electronProcess.pid)
                    electronProcess = null
                    startElectron()

                    setTimeout(() => {
                        manualRestart = false
                    }, 5000)
                }

                resolve()

            } else if (event.code === 'ERROR') {
                reject(event.error)
            }
        })
    })
}

function startElectron() {

    var args = [
        '--inspect=5858',
        path.join(__dirname, '../dist/electron/main/main.js')
    ]

    // detect yarn or npm and process commandline args accordingly
    if (process.env.npm_execpath.endsWith('yarn.js')) {
        args = args.concat(process.argv.slice(3))
    } else if (process.env.npm_execpath.endsWith('npm-cli.js')) {
        args = args.concat(process.argv.slice(2))
    }

    electronProcess = spawn(electron, args)

    electronProcess.stdout.on('data', data => {
        electronLog(removeJunk(data), 'blue')
    })
    electronProcess.stderr.on('data', data => {
        electronLog(removeJunk(data), 'red')
    })

    electronProcess.on('close', () => {
        if (!manualRestart) process.exit()
    })
}

function electronLog(data, color) {
    if (data) {
        let log = ''
        data = data.toString().split(/\r?\n/)
        data.forEach(line => {
            log += `  ${line}\n`
        })
        if (/[0-9A-z]+/.test(log)) {
            console.log(
                chalk[color].bold(`┏ Electron -------------------`) +
                '\n\n' +
                log +
                chalk[color].bold('┗ ----------------------------') +
                '\n'
            )
        }
    }

}

function greeting() {
    const cols = process.stdout.columns
    let text = ''

    if (cols > 104) text = 'electron-vite'
    else if (cols > 76) text = 'electron-|vite'
    else text = false

    if (text) {
        say(text, {
            colors: ['yellow'],
            font: 'simple3d',
            space: false
        })
    } else console.log(chalk.yellow.bold('\n  electron-vite'))
    console.log(chalk.blue(`getting ready...`) + '\n')
}

async function init() {
    greeting()

    try {
        await startRenderer()
        if (process.env.TARGET !== 'web') {
            await startMain()
            await startElectron()
        }
    } catch (error) {
        console.error(error)
        process.exit(1)
    }

}

init()