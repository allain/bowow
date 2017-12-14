const request = require('sync-request')
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

  click(xpath) {
    debug('clicking on %s', xpath)
    const el = this._findElementByXPath(xpath)

    return this._post(`/element/${el.value.ELEMENT}/click`)
  }

  static create(driverRoot, opts = {}) {
    const downloadPath = `/tmp/bowow-${process.pid}-${Date.now()}`
    const args = [].concat(opts.headless ? ['headless'] : [])
    const sessionResponse = request('POST', `${driverRoot}/session`, {
      json: {
        desiredCapabilities: {
          browserName: 'chrome',
          chromeOptions: {
            args,
            prefs: {
              download: {
                prompt_for_download: false,
                default_directory: downloadPath
              }
            }
          }
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
