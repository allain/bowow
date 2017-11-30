/* global jQuery, wait$ */
const jQueryProperties = ['length', 'jquery', 'selector']

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

  const proxy = new Proxy(
    {},
    {
      get(target, prop) {
        if (prop === 'then') return undefined

        if (jQueryProperties.includes(prop))
          return session.execute(({ proxyID, prop }) => window[proxyID][prop], {
            proxyID,
            prop
          })

        if (prop === 'xpath')
          return session.execute(
            ({ proxyID, prop }) => {
              function getElementXPath(element) {
                if (!element) return null

                if (element.id) return `//*[@id="${element.id}"]`

                if (element.tagName === 'BODY') return '/html/body'

                const sameTagSiblings = Array.from(
                  element.parentNode.childNodes
                ).filter(e => e.nodeName === element.nodeName)
                const idx = sameTagSiblings.indexOf(element)

                return (
                  getElementXPath(element.parentNode) +
                  '/' +
                  element.tagName.toLowerCase() +
                  (sameTagSiblings.length > 1 ? `[${idx + 1}]` : '')
                )
              }
              return getElementXPath(window[proxyID].get(0))
            },
            { proxyID }
          )

        if (prop === 'type')
          return (...args) => {
            const xpath = proxy.xpath

            session.sendKeys(xpath, ...args)

            return proxy
          }

        return (...args) => {
          session.execute(
            `({ proxyID, prop }) => (window[proxyID] = window[proxyID].${
              prop
            }(${toArgs(args)}))`,
            { proxyID, prop }
          )

          return proxy
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
