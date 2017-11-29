const generateCode = require('./generate-code')

module.exports = (selector, session, timeout = 30000) => {
  const chain = []

  const proxy = new Proxy(Promise.resolve(), {
    get(target, fieldName) {
      return chainHandlers
        .find(h => h.test(fieldName, target))
        .handle(fieldName, target)
    }
  })

  const chainHandlers = [
    {
      test: prop => prop === 'then',
      handle: (prop, target) => {
        const result = target.then(() => session.execute(toCode()))
        return result.then.bind(result)
      }
    },
    {
      test: prop => prop === 'toCode',
      handle: () => toCode
    },
    {
      test: prop => prop === 'length',
      handle: prop => {
        chain.push({ prop })
        return proxy
      }
    },
    {
      test: (prop, target) => typeof target[prop] === 'undefined', // not defined on Promise?, assume it's for jQuery
      handle: prop => (...args) => {
        chain.push({ method: prop, args })
        return proxy
      }
    },
    {
      test: () => true,
      handle: (prop, target) => target[prop]
    }
  ]

  const toCode = () => generateCode(selector, chain, timeout)

  return proxy
}
