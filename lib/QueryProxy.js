const jQuery = require('jquery')
const jQueryMethods = Object.keys(jQuery.fn).filter(
  method => jQuery.fn[method] instanceof Function
)

module.exports = (selector, session, required = false) => {
  const calls = []

  const target = Promise.resolve()

  const proxy = new Proxy(target, {
    get(t, propKey) {
      if (propKey === 'then') {
        const result = target.then(() => session.execute(toCode()))
        return result.then.bind(result)
      } else if (propKey === 'toCode') {
        return toCode
      } else if (jQueryMethods.includes(propKey)) {
        return (...args) => {
          calls.push({ method: propKey, args })
          return proxy
        }
      } else {
        return target[propKey]
      }
    }
  })

  function toCode() {
    if (required) {
      return `() => $$(${JSON.stringify(
        selector
      )}).then(els => els${toMethodCalls(calls)})`
    } else {
      return `() => jQuery(${JSON.stringify(selector)})${toMethodCalls(calls)}`
    }
  }

  function toMethodCalls(calls) {
    return calls
      .map(({ method, args }) => {
        const inlineArgs = args
          .map(a => {
            switch (typeof a) {
              case 'function':
                return a.toString()
              case 'string':
                return JSON.stringify(a)
              case 'object':
                return JSON.stringify(a)
              default:
                return a
            }
          })
          .join(',')
        return `.${method}(${inlineArgs})`
      })
      .join('')
  }

  return proxy
}
