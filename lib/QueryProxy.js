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

        if (prop === 'filter') {
          return (...args) => {
            let result
            if (typeof args[0] === 'string') {
              result = session.execute(
                `({ proxyID }) => {
                  window[proxyID] = window[proxyID].filter(function() {
                    return $(this).text().trim() === ${JSON.stringify(args[0])}
                  })
                  return '$CHAIN$'
                }`,
                { proxyID }
              )
            } else if (args[0] instanceof RegExp) {
              result = session.execute(
                `({ proxyID }) => {
                  window[proxyID] = window[proxyID].filter(function() {
                    return $(this).text().match(${args[0].toString()})
                  })
                  return '$CHAIN$'
                }`,
                { proxyID }
              )
            } else {
              result = session.execute(
                `({ proxyID }) => {
              let result = (window[proxyID] = window[proxyID].filter(${toArgs(
                args
              )}))
              return (result && result.jquery) ? '$CHAIN$' : result
            }`,
                { proxyID }
              )
            }

            return result === '$CHAIN$' ? proxy : result
          }
        }

        return (...args) => {
          let result = session.execute(
            `({ proxyID, prop }) => {
            let result = window[proxyID][prop](${toArgs(args)})
            if (result && result.jquery) {
              window[proxyID] = result
              return '$CHAIN$'
            }
            return result
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
