const fetch = require('node-fetch')
const debug = require('debug')('Session')

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
    const fnCode = fn.toString()
    const script = `
      let args = Array.from(arguments)

      let callback = args.pop()
      new Promise(resolve => resolve((${
        fnCode
      }).apply(null, args))).then(result => callback(result), err => callback({_error: err.message}))
      `

    debug('invoking script on client %s with args %j', script, args)
    console.log('invoking script on client %s with args %j', script, args)

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
