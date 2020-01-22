const fs = require('fs')

const jQueryPath = require.resolve('jquery').replace(/[.]js$/, '.min.js')
const jQueryCode = fs.readFileSync(jQueryPath, 'utf-8')

module.exports = fn => `
let args = Array.from(arguments)
let callback = args.pop();

if (typeof jQuery === 'undefined') {
  console.log("injecting jQuery")
  ${jQueryCode};
} else {
  console.log('using existing jQuery')
}

if (!window.getElementXPath) {
  window.getElementXPath = function getElementXPath(element) {
    if (!element) return null

    if (element.id) return '//*[@id="' + element.id + '"]'

    if (element.tagName === 'BODY') return '/html/body'

    const sameTagSiblings = Array.from(
      element.parentNode.childNodes
    ).filter(e => e.nodeName === element.nodeName)
    const idx = sameTagSiblings.indexOf(element)

    return (
      getElementXPath(element.parentNode) +
      '/' +
      element.tagName.toLowerCase() +
      (sameTagSiblings.length > 1 ? ('[' + (idx + 1) + ']') : '')
    )
  }
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
    if (result && result.then) {
      return result
    }
    
    return Promise.resolve(typeof result ==='undefined' ? true : result)
  } catch(err) {
    return Promise.reject(err)
  }
}

runCode().then(callback, err => callback({_error: err.message}))
`
