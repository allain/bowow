const fs = require('fs')
const path = require('path')
const jQueryCode = fs.readFileSync(
  path.resolve(
    __dirname,
    '..',
    'node_modules',
    'jquery',
    'dist',
    'jquery.min.js'
  ),
  'utf-8'
)

const request = require('sync-request')
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

  static create(driverRoot) {
    const sessionResponse = request('POST', `${driverRoot}/session`, {
      json: {
        desiredCapabilities: {
          browserName: 'Chrome'
        }
      }
    })

    if (sessionResponse.statusCode >= 300)
      throw new Error('Unable to create session: ' + sessionResponse.body)

    const body = JSON.parse(sessionResponse.body.toString('utf-8'))
    return new Session(`${driverRoot}/session/${body.sessionId}`)
  }

  execute(fn, args) {
    debug('executing %s with args %j', fn.toString(), args)
    try {
      return this._execute(fn, args)
    } catch (err) {
      if (
        ['jQuery is not defined', 'wait$ is not defined'].includes(err.message)
      )
        return this.execute(fn, args)

      throw err
    }
  }

  _execute(fn, args) {
    const fnCode = fn.toString()
    const script = `
      let args = Array.from(arguments)
      let callback = args.pop();

      if (typeof jQuery === 'undefined') {
        ${jQueryCode};
      }

      if (typeof window.wait$ === 'undefined') {
        const wait = ({ timeout, interval }) => (
          predicate,
          message = 'Timeout Waiting'
        ) =>
          new Promise((resolve, reject) => {
            let waiting = 0
            const waitId = setInterval(() => {
              let result = predicate()
              if (result) {
                clearInterval(waitId)
                return resolve(result)
              }

              waiting += interval
              if (waiting > timeout) {
                clearInterval(waitId)
                reject(new Error(message))
              }
            }, 250)
          })

        window.wait$ = (
          selector,
          { timeout = 30000, interval = 250, message } = {}
        ) =>
          wait({ timeout, interval })(() => {
            const els = window.jQuery(selector)
            return els.length ? els : null
          }, message || "Timeout Waiting for elements to match selector: " + selector)
      }

      function runCode() {
        try {
          let result = (${fnCode}).apply(null, args)
          return Promise.resolve(typeof result ==='undefined' ? true : result)
        } catch(err) {
          return Promise.reject(err)
        }
      }

      runCode().then(callback, err => callback({_error: err.message}))
    `

    const execResponse = request('POST', `${this.url}/execute/async`, {
      json: {
        script,
        args: [].concat(args)
      }
    })

    if (execResponse.status >= 300)
      throw new Error('Unable to execute: ' + execResponse.body.toString())

    const result = JSON.parse(execResponse.body.toString())
    if (result.value && result.value._error)
      throw new Error(result.value._error)

    return result.value
  }
}
