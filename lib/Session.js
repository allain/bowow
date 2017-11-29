const request = require('sync-request')
const generateExecuteScript = require('./generators/generate-execute-script')

const debug = require('debug')('bowow:Session')

module.exports = class Session {
  constructor(url) {
    this.url = url
    debug(`session url is ${url}`)
  }

  delete() {
    debug(`delete session ${this.url}`)
    return request('DELETE', this.url)
  }

  execute(fn, args) {
    debug('executing %s with args %j', fn.toString(), args)
    const execResponse = request('POST', `${this.url}/execute/async`, {
      json: {
        script: generateExecuteScript(fn),
        args: [].concat(args)
      }
    })

    if (execResponse.status >= 300)
      throw new Error(
        'Unable to execute: ' + execResponse.body.toString('utf-8')
      )

    const result = JSON.parse(execResponse.body.toString('utf-8'))
    if (result.value && result.value._error)
      throw new Error(result.value._error)

    return result.value
  }

  static create(driverRoot) {
    const sessionResponse = request('POST', `${driverRoot}/session`, {
      json: {
        desiredCapabilities: {
          browserName: 'Chrome'
        }
      }
    })

    if (sessionResponse.statusCode >= 300)
      throw new Error(
        'Unable to create session: ' + sessionResponse.body.toString('utf-8')
      )

    const body = JSON.parse(sessionResponse.body.toString('utf-8'))
    return new Session(`${driverRoot}/session/${body.sessionId}`)
  }
}
