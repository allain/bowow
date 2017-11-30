/* global jQuery, wait$ */
const jQueryProperties = ['length', 'jquery', 'selector']
const util = require('util')
module.exports = (selector, session, timeout = 30000) => {
  const proxyID = 'proxy' + Math.floor(Math.random() * 1000000)

  if (timeout >= 0) {
    session.execute(
      ({ proxyID, selector, timeout }) =>
        wait$(selector, { timeout }).then(els => (window[proxyID] = els)),
      { proxyID, selector, timeout }
    )
  } else {
    // no need to wait for selector to match, just bully ahead
    session.execute(
      ({ proxyID, selector }) => (window[proxyID] = jQuery(selector)),
      { proxyID, selector }
    )
  }

  const currentXPath = () =>
    session.execute('({proxyID}) => getElementXPath(window[proxyID].get(0))', {
      proxyID
    })

  const proxy = new Proxy(
    {},
    {
      get(target, prop) {
        if (prop === 'then') return undefined
        if (prop === 'inspect') return undefined
        if (prop === util.inspect.custom) return undefined

        if (jQueryProperties.includes(prop))
          return session.execute(({ proxyID, prop }) => window[proxyID][prop], {
            proxyID,
            prop
          })

        if (prop === 'type')
          return (...args) => {
            session.sendKeys(currentXPath(), ...args)
            return proxy
          }

        return (...args) => {
          let result = session.execute(
            `({ proxyID, prop }) => {
            let result = (window[proxyID] = window[proxyID][prop](${toArgs(
              args
            )}))
            return (result && result.jquery) ? '$CHAIN$' : result
          }`,
            { proxyID, prop }
          )

          return result === '$CHAIN$' ? proxy : result
        }
      }
    }
  )

  return proxy
}

function toArgs(args) {
  return args.map(toArg).join(',')
}

const argHandlers = {
  function: a => a.toString(),
  string: a => JSON.stringify(a),
  object: a => JSON.stringify(a)
}
function toArg(a) {
  return (argHandlers[typeof a] || (a => a))(a)
}
