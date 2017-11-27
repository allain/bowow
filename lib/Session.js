const injectJQuery = require('./browser-scripts/inject-jquery')
const injectWaiter = require('./browser-scripts/inject-waiter')

const fetch = require('node-fetch')
const debug = require('debug')('bowow:Session')

module.exports = class Session {
  constructor(url) {
    this.url = url
    debug(`session url is ${url}`)
  }

  delete() {
    debug(`delete session ${this.url}`)
    return fetch(this.url, { method: 'DELETE' })
  }

  static create(driverRoot) {
    return fetch(`${driverRoot}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        desiredCapabilities: {
          browserName: 'Chrome'
        }
      })
    })
      .then(res => res.json())
      .then(
        sessionSpec =>
          new Session(`${driverRoot}/session/${sessionSpec.sessionId}`)
      )
  }

  execute(fn, args) {
    return this._execute(injectJQuery)
      .then(() => this.execute(injectWaiter))
      .then(() => this._execute(fn, args))
  }

  _execute(fn, args) {
    const fnCode = fn.toString()
    const script = `
      let args = Array.from(arguments)
      let callback = args.pop()

      function runCode() {
        try {
          let result = (${fnCode}).apply(null, args)
          return Promise.resolve(result || true)
        } catch(err) {
          return Promise.reject(err)
        }
      }

      runCode().then(callback, err => callback({_error: err.message}))
      `

    return fetch(`${this.url}/execute/async`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script,
        args: args ? [args] : []
      })
    })
      .then(res => res.json())
      .then(result => {
        if (result.value && result.value._error)
          throw new Error(result.value._error)

        return result.value
      })
  }
}
