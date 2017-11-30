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
        if (jQueryProperties.includes(prop))
          return session.execute(({ proxyID, prop }) => window[proxyID][prop], {
            proxyID,
            prop
          })

        return (...args) => {
          session.execute(
            ({ proxyID, prop, args }) =>
              (window[proxyID] = window[proxyID][prop].apply(
                window[proxyID],
                args
              )),
            { proxyID, args, prop }
          )

          return proxy
        }
      }
    }
  )

  return proxy
}
