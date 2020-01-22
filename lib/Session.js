const request = require('sync-request')
const fs = require('fs')
const generateExecuteScript = require('./generators/generate-execute-script')

const debug = require('debug')('bowow:Session')

module.exports = class Session {
  constructor(url, downloadPath) {
    this.url = url
    this.downloadPath = downloadPath
    debug(
      `session url is ${url} and downloads will be place in ${downloadPath}`
    )
  }

  delete() {
    debug(`delete session ${this.url}`)
    return request('DELETE', this.url)
  }

  _post(path, payload = {}) {
    const execResponse = request('POST', `${this.url}${path}`, {
      json: payload
    })

    if (execResponse.status >= 300)
      throw new Error(
        'Unable to execute: ' + execResponse.body.toString('utf-8')
      )

    return JSON.parse(execResponse.body.toString('utf-8'))
  }

  _get(path) {
    const execResponse = request('GET', `${this.url}${path}`)

    if (execResponse.status >= 300)
      throw new Error(
        'Unable to execute: ' + execResponse.body.toString('utf-8')
      )

    return JSON.parse(execResponse.body.toString('utf-8'))
  }

  frame(id) {
    debug('switching to frame %s', id)

    const result = this._post('/frame', { id })

    if (result.status === 8) throw new Error('frame not found')

    debug('switched to frame: %j', result)

    return this
  }

  execute(fn, args) {
    debug('executing %s with args %j', fn.toString(), args)
    const result = this._post('/execute/async', {
      script: generateExecuteScript(fn),
      args: [].concat(args)
    })

    debug('result was: %j', result)

    if (result.value && result.value._error)
      throw new Error(result.value._error)

    if (result.status === 28)
      // Timeout executing
      throw new Error('asynchronous script timeout')

    return result.value
  }

  _findElementByXPath(xpath) {
    return this._post('/element', {
      using: 'xpath',
      value: xpath
    })
  }

  sendKeys(xpath, keys) {
    debug('sending keys to  %s %j', xpath, keys)
    const el = this._findElementByXPath(xpath)

    return this._post(`/element/${el.value.ELEMENT}/value`, { value: [keys] })
  }

  clear(xpath) {
    debug('clearing %s', xpath)
    const el = this._findElementByXPath(xpath)

    return this._post(`/element/${el.value.ELEMENT}/clear`, {})
  }

  click(xpath) {
    debug('clicking on %s', xpath)
    const el = this._findElementByXPath(xpath)

    const result = this._post(`/element/${el.value.ELEMENT}/click`)
    if (result.status) {
      throw new Error('unable to click: ' + result.value.message)
    }

    return result
  }

  screenshot() {
    debug('taking screenshot')
    const result = this._get(`/screenshot`)
    if (result.status) {
      throw new Error('unable to click: ' + result.value.message)
    }

    return Buffer.from(result.value, 'base64')
  }

  static create(driverRoot, opts = {}) {
    const downloadPath = fs.mkdtempSync(
      `/tmp/bowow-${process.pid}-${Date.now()}`
    )
    const args = [].concat(opts.headless ? ['headless'] : [])

    const chromeOptions = {
      args,
      prefs: {
        download: {
          prompt_for_download: false,
          default_directory: downloadPath
        }
      }
    }

    if (opts.device) {
      chromeOptions.mobileEmulation = {
        deviceName: opts.device
      }
    } else if (opts.mobileEmulation) {
      chromeOptions.mobileEmulation = opts.mobileEmulation
    }

    const sessionResponse = request('POST', `${driverRoot}/session`, {
      json: {
        desiredCapabilities: {
          browserName: 'chrome',
          chromeOptions
        }
      }
    })

    if (sessionResponse.statusCode >= 300)
      throw new Error(
        'Unable to create session: ' + sessionResponse.body.toString('utf-8')
      )

    const body = JSON.parse(sessionResponse.body.toString('utf-8'))

    return new Session(`${driverRoot}/session/${body.sessionId}`, downloadPath)
  }
}
