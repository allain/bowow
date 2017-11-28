module.exports = (selector, session, opts = {}) => {
  const calls = []

  opts = opts || {}
  const timeout = opts.wait ? opts.wait * 1000 : 30000

  const target = Promise.resolve()

  const proxy = new Proxy(target, {
    get(t, propKey) {
      if (propKey === 'then') {
        const result = target.then(() => session.execute(toCode()))
        return result.then.bind(result)
      } else if (propKey === 'toCode') {
        return toCode
      } else if (propKey === 'length') {
        calls.push({ prop: propKey })
        return proxy
      } else if (typeof target[propKey] === 'undefined') {
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
    return needsWaiting(timeout, calls)
      ? toWaitingCode(timeout)
      : toInstantCode()
  }

  function needsWaiting(timeout, calls) {
    return timeout >= 0 && !isLastCallProp(calls)
  }

  function isLastCallProp(calls) {
    const lastCall = calls[calls.length - 1]
    return lastCall && lastCall.prop
  }

  function toWaitingCode(timeout) {
    return `() => wait$(${JSON.stringify(selector)}, {timeout: ${
      timeout
    }}).then(els => els${toMethodCalls(calls)})`
  }

  function toInstantCode(timeout) {
    return `() => jQuery(${JSON.stringify(selector)})${toMethodCalls(calls)}`
  }

  function toMethodCalls(calls) {
    return calls
      .map(({ method, args, prop }) => {
        if (prop) return `.${prop}`

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
