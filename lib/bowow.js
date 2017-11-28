const chromedriver = require('./webdrivers/chromedriver')
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
  const driver = await chromedriver()

  let session = null
  try {
    await until(() => fetch(driver.rootUrl), 5000)
    session = await Session.create(driver.rootUrl)
    const result = await fn(build$(session), build$$(session))
    await tearDown(session)
    return result
  } catch (err) {
    await tearDown(session)
    throw err
  }

  async function tearDown(session) {
    if (session) await session.delete()
    await driver.stop()
  }
}

function build$(session) {
  const $ = function(target) {
    if (typeof target === 'string' && target.match(/^https?:\/\/.*/)) {
      return $.go(target)
    }

    if (typeof target === 'function') {
      return session.execute(target, Array.from(arguments).slice(1))
    }

    let args = Array.from(arguments).slice(1)

    let wait = 30
    if (typeof args[0] === 'object') {
      wait = args[0].wait || 30
    } else if (typeof args === 'number') {
      wait = args[0]
    }

    return QueryProxy(target, session, {
      wait
    })
  }

  $.go = url => session.execute(url => (window.location.href = url), url)
  $.refresh = () => session.execute(() => window.location.reload())
  $.back = () => session.execute(() => window.history.back())
  $.forward = () => session.execute(() => window.history.forward())

  return $
}

function build$$(session) {
  return selector => QueryProxy(selector, session, false)
}
