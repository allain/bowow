/* global jQuery, wait$ */
const util = require('util')
const debug = require('debug')('bowow:QueryProxy')

const jQueryProperties = ['length', 'jquery', 'selector']

module.exports = function QueryProxy(selector, session, timeout = 30000) {
  debug("Creating QueryProxy for selector", selector)
  const proxyID = 'proxy' + Math.floor(Math.random() * 1000000)

  if (timeout >= 0) {
    let waited = 0
    let found = false
    while (waited < timeout) {
      found = session.execute(selector => jQuery(selector).length > 0, selector)
      if (found) break
      session.execute(() => new Promise(resolve => setTimeout(resolve, 250)))
      waited += 250
    }
    if (!found) {
      throw new Error('unable to find element: ' + selector)
    }
  }

  session.execute(
    ({ proxyID, selector }) => (window[proxyID] = jQuery(selector)),
    { proxyID, selector }
  )

  const currentXPath = () => {
    const xpath = session.execute(
      '({proxyID}) => window[proxyID] ? getElementXPath(window[proxyID].get(0)) : null',
      {
        proxyID
      }
    )

    if (!xpath) throw new Error(`Unable to compute xpath (${selector})`)

    return xpath
  }

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
            const opts =
              typeof args[args.length - 1] === 'object'
                ? args[args.length - 1]
                : {}

            const skipClear = opts.clear === false
            if (!skipClear) {
              let start = Date.now()
              let cleared = false
              do {
                const result = session.clear(currentXPath())
                cleared = !result.status
              } while (!cleared && Date.now() - start < 30000)

              if (!cleared) {
                throw new Error('Timed out waiting for element to editable')
              }
            }

            session.sendKeys(currentXPath(), ...args)
            return proxy
          }

        if (prop === 'click')
          return (...args) => {
            const start = Date.now()
            let clicked = false
            do {
              try {
                session.click(currentXPath(), ...args)
                clicked = true
              } catch (err) {
                debug(err)
                session.execute(
                  () => new Promise(resolve => setTimeout(resolve, 1000))
                ) // synchronous sleep
              }
            } while (!clicked && Date.now() - start < 30000)

            if (!clicked)
              throw new Error('element not found')

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
