const chromedriver = require('./webdrivers/chromedriver')
const fetch = require('node-fetch')
const Session = require('./Session')
const QueryProxy = require('./QueryProxy')
const until = require('./until')

module.exports = async function bowow(fn) {
  const driver = await chromedriver()

  let session
  try {
    await until(() => fetch(driver.rootUrl), 5000)
    session = await Session.create(driver.rootUrl)
    const result = await fn(build$(session))
    await tearDown(driver, session)
    return result
  } catch (err) {
    await tearDown(driver, session)
    throw err
  }
}

async function tearDown(driver, session) {
  if (session) await session.delete()
  await driver.stop()
}

function build$(session) {
  const $ = function(target) {
    if (typeof target === 'string' && target.match(/^https?:\/\/.*/))
      return $.go(target)

    if (typeof target === 'function')
      return session.execute(target, Array.from(arguments).slice(1))

    let timeout = extractTimeout([...arguments].slice(1))

    return QueryProxy(target, session, timeout)
  }

  $.go = url => session.execute(url => (window.location.href = url), url)
  $.refresh = () => session.execute(() => window.location.reload())
  $.back = () => session.execute(() => window.history.back())
  $.forward = () => session.execute(() => window.history.forward())

  return $
}

function extractTimeout(args) {
  let wait = 30
  if (typeof args[0] === 'object') {
    wait = args[0].wait || 30
  } else if (typeof args === 'number') {
    wait = args[0]
  }
  return wait * 1000
}
