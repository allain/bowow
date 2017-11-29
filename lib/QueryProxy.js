/* global jQuery, wait$ */

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
      get(target, fieldName) {
        if (fieldName === 'length')
          return session.execute(({ proxyID }) => window[proxyID].length, {
            proxyID
          })

        return (...args) => {
          session.execute(
            ({ proxyID, prop, args }) =>
              (window[proxyID] = window[proxyID][prop].apply(
                window[proxyID],
                args
              )),
            { proxyID, args, prop: fieldName }
          )

          return proxy
        }
      }
    }
  )

  return proxy
}
