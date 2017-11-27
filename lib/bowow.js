const getPort = require('get-port')
const chromedriver = require('chromedriver')
const fetch = require('node-fetch')
const Session = require('./Session')

const debug = require('debug')('bowow')
const QueryProxy = require('./QueryProxy')

module.exports = bowow

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

async function until(fn, timeout, interval) {
  if (timeout < 0) throw new Error('timeout waiting')

  const truth = await fn().then(result => !!result, () => false)
  if (!truth) {
    await wait(interval)

    return until(fn, timeout - interval, interval)
  }
}

async function bowow(fn) {
  const port = await getPort()
  const rootUrl = `http://localhost:${port}`

  debug(`starting chromedriver on port ${port}`)
  await chromedriver.start([`--port=${port}`])

  let session = null
  try {
    await until(() => fetch(rootUrl), 5000)
    session = await Session.create(rootUrl)
    const result = await fn(build$(session), build$$(session))
    await tearDown(session)
    return result
  } catch (err) {
    await tearDown(session)
    throw err
  }

  async function tearDown(session) {
    if (session) await session.delete()
    await chromedriver.stop()
  }
}

function build$(session) {
  const $ = (target, args) => {
    if (typeof target === 'string' && target.match(/^https?:\/\/.*/)) {
      return $.go(target)
    }

    if (typeof target === 'function') {
      return session.execute(target, args)
    }

    return QueryProxy(target, session, false)
  }

  $.go = url => session.execute(url => (window.location.href = url), url)
  $.refresh = () => session.execute(() => window.location.reload())
  $.back = () => session.execute(() => window.history.back())
  $.forward = () => session.execute(() => window.history.forward())

  return $
}

function build$$(session) {
  return selector => QueryProxy(selector, session, true)
}
