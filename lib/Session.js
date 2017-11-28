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
// const injectJQuery = require('./browser-scripts/inject-jquery')
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
    return this._execute(fn, args).catch(err => {
      if (
        ['jQuery is not defined', 'wait$ is not defined'].includes(err.message)
      )
        return this.execute(fn, args)
      throw err
    })
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
        args: [].concat(args)
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
