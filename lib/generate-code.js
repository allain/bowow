module.exports = function generateCode(selector, chain, timeout) {
  return needsWaiting(chain, timeout)
    ? toWaitingCode(selector, chain, timeout)
    : toInstantCode(selector, chain)
}

const needsWaiting = (chain, timeout) =>
  timeout >= 0 && (chain.length && !chain[chain.length - 1].prop)

const toWaitingCode = (selector, chain, timeout) =>
  `() => wait$(${JSON.stringify(selector)}, {timeout: ${
    timeout
  }}).then(els => els${toChainCode(chain)})`

const toInstantCode = (selector, chain) =>
  `() => jQuery(${JSON.stringify(selector)})${toChainCode(chain)}`

// generates .a().b().c
const toChainCode = chain =>
  chain
    .map(
      ({ method, args, prop }) =>
        prop ? `.${prop}` : `.${method}(${toArgsCode(args)})`
    )
    .join('')

const toArgsCode = args => args.map(toArgCode).join(',')

const toArgCode = a => {
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
}
