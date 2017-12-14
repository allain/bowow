const chromedriver = require('./webdrivers/chromedriver')
const Session = require('./Session')
const QueryProxy = require('./QueryProxy')
const waitForPort = require('util').promisify(require('wait-for-port'))
const fs = require('fs')
const path = require('path')

module.exports = async function bowow(fn, opts = {}) {
  const driver = await chromedriver()

  let session
  try {
    await waitForPort('0.0.0.0', driver.port, {
      retryInterval: 100,
      numRetries: 100
    })
    session = await Session.create(driver.rootUrl, opts)
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
  $.downloads = () => listSessionDownloads(session)
  $.sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

  return $
}

function listSessionDownloads(session) {
  if (!fs.existsSync(session.downloadPath)) return []

  return fs
    .readdirSync(session.downloadPath)
    .map(f => path.resolve(session.downloadPath, f))
}

function extractTimeout(args) {
  let wait = 30

  if (typeof args[0] === 'object') wait = args[0].wait || 30
  if (typeof args[0] === 'number') wait = args[0]

  return wait === -1 ? -1 : wait * 1000
}
