const {app, ipcMain, dialog} = require('electron')
const fs = require('fs-extra')
const path = require('path')
const getData = require('./getData').getData
const {version} = require('../../package.json')
const config = require('./config')
const {Octokit} = require('@octokit/core')
const fetch = require('electron-fetch').default
const getTimeString = () => {
    return new Date().toLocaleString('sv').replace(/[- :]/g, '').slice(0, -2)
}

const formatDate = (date) => {
    let y = date.getFullYear()
    let m = `${date.getMonth() + 1}`.padStart(2, '0')
    let d = `${date.getDate()}`.padStart(2, '0')
    return `${y}-${m}-${d} ${date.toLocaleString('zh-cn', {hour12: false}).slice(-8)}`
}

const fakeIdFn = () => {
    let id = 1000000000000000000n
    return () => {
        id = id + 1n
        return id.toString()
    }
}

const shouldBeString = (value) => {
    if (typeof value !== 'string') {
        return ''
    }
    return value
}

const start = async () => {
    const {dataMap, current} = await getData()
    const data = dataMap.get(current)
    if (!data?.result.size) {
        throw new Error('数据为空')
    }
    const fakeId = fakeIdFn()
    const result = {
        info: {
            uid: data.uid,
            lang: data.lang,
            export_time: formatDate(new Date()),
            export_timestamp: Date.now(),
            export_app: 'genshin-wish-export',
            export_app_version: `v${version}`,
            uigf_version: 'v2.2'
        },
        list: []
    }
    const listTemp = []
    for (let [type, arr] of data.result) {
        arr.forEach(item => {
            listTemp.push({
                gacha_type: shouldBeString(item[4]) || type,
                time: item[0],
                timestamp: new Date(item[0]).getTime(),
                name: item[1],
                item_type: item[2],
                rank_type: `${item[3]}`,
                id: shouldBeString(item[5]) || '',
                uigf_gacha_type: type
            })
        })
    }
    listTemp.sort((a, b) => a.timestamp - b.timestamp)
    listTemp.forEach(item => {
        delete item.timestamp
        result.list.push({
            ...item,
            id: item.id || fakeId()
        })
    })

    if (!config.gistsToken) {
        throw new Error('未设置gistsToken')
    }

    const octokit = new Octokit({
        request: {fetch: fetch},
        auth: config.gistsToken
    })

    if (config.gistsId) {
        await octokit.request('PATCH /gists/{gist_id}', {
            gist_id: config.gistsId,
            files: {
                // 这里文件名不需要加时间戳，加入时间戳会产生多个文件
                [`UIGF_${data.uid}.json`]: {
                    content: JSON.stringify(result, null, 2)
                }
            },
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
    } else {
        const response = await octokit.request('POST /gists', {
            description: 'genshin-wish-export',
            'public': false,
            files: {
                [`UIGF_${data.uid}.json`]: {
                    content: JSON.stringify(result, null, 2)
                }
            },
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
        if (response.status === 201) {
            config["gistsId"] = response.data.id
            await config.save()
        }
    }

}

ipcMain.handle('EXPORT_UIGF_JSON_GISTS', async () => {
    await start()
})
