module.exports = () => {
  if (window.$$) return // already installed

  const wait = ({ timeout, interval }) => (
    predicate,
    message = 'Timeout Waiting'
  ) =>
    new Promise((resolve, reject) => {
      let waiting = 0
      const waitId = setInterval(() => {
        let result = predicate()
        if (result) {
          clearInterval(waitId)
          return resolve(result)
        }

        waiting += interval
        if (waiting > timeout) {
          clearInterval(waitId)
          reject(new Error(message))
        }
      }, 250)
    })

  window.$$ = (selector, { timeout = 30000, interval = 250, message } = {}) =>
    wait({ timeout, interval })(() => {
      const els = window.jQuery(selector)
      return els.length ? els : null
    }, message || `Timeout Waiting for elements to match selector: ${selector}`)
}
