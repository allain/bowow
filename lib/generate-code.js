module.exports = function generateCode(selector, chain, timeout) {
  return needsWaiting(chain, timeout)
    ? toWaiting(selector, chain, timeout)
    : toInstant(selector, chain)
}

const needsWaiting = (chain, timeout) =>
  timeout >= 0 && (chain.length && !chain[chain.length - 1].prop)

const toWaiting = (selector, chain, timeout) =>
  `() => wait$(${JSON.stringify(selector)}, {timeout: ${
    timeout
  }}).then(els => els${toChain(chain)})`

const toInstant = (selector, chain) =>
  `() => jQuery(${JSON.stringify(selector)})${toChain(chain)}`

// generates .a().b().c
const toChain = chain =>
  chain
    .map(
      ({ method, args, prop }) =>
        prop ? `.${prop}` : `.${method}(${toArgs(args)})`
    )
    .join('')

const toArgs = args => args.map(toArg).join(',')

const argHandlers = {
  function: a => a.toString(),
  string: a => JSON.stringify(a),
  object: a => JSON.stringify(a)
}

const toArg = a => (argHandlers[typeof a] || (a => a))(a)
