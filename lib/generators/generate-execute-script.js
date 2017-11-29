const fs = require('fs')
const path = require('path')
const jQueryCode = fs.readFileSync(
  path.resolve(
    __dirname,
    '..',
    '..',
    'node_modules',
    'jquery',
    'dist',
    'jquery.min.js'
  ),
  'utf-8'
)

module.exports = fn => `
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
      let result = (${fn.toString()}).apply(null, args)
      return Promise.resolve(typeof result ==='undefined' ? true : result)
    } catch(err) {
      return Promise.reject(err)
    }
  }

  runCode().then(callback, err => callback({_error: err.message}))
`
