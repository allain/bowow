module.exports = (selector, session) => {
  const calls = []

  const proxy = new Proxy(
    {
      toCode: () =>
        `() => jQuery(${JSON.stringify(selector)})${toMethodCalls(calls)}`
    },
    {
      get(target, propKey) {
        return (...args) => {
          if (propKey === 'then') {
            return session.execute(target.toCode())
          }
          if (propKey === 'toCode') {
            return target[propKey]()
          }
          calls.push({ method: propKey, args })
          return proxy
        }
      }
    }
  )

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
