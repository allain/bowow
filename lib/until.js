const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

module.exports = async function until(predicate, timeout, interval) {
  if (timeout < 0) throw new Error('timeout waiting')

  const truth = await predicate().then(result => result || false, () => false)
  if (!truth) {
    await wait(interval)

    return until(predicate, timeout - interval, interval)
  }
}
