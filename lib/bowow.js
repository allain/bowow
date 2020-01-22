const chromedriver = require('./webdrivers/chromedriver')
const Session = require('./Session')
const QueryProxy = require('./QueryProxy')
const waitForPort = require('util').promisify(require('wait-for-port'))
const fs = require('fs')
const path = require('path')
const sleep = require('./sync-sleep')
const tmp = require('tmp')
const debug = require('debug')('bowow')

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
  let lastFramed = false
  const $ = function (target) {
    if (typeof target === 'string' && target.match(/^https?:\/\/.*/))
      return $.go(target)

    if (typeof target === 'function')
      return session.execute(target, Array.from(arguments).slice(1))

    if (typeof target === 'number')
      return $.wait(target, arguments[1], arguments[2])

    let timeout = extractTimeout([...arguments].slice(1))

    if (lastFramed) {
      session.frame(null) // move back up to the top level window frame every time
      lastFramed = false
    }
    // If the selector starts with iframe#ID then move the session into it, supports nesting
    let iframeSelectorParts
    while (iframeSelectorParts = target.match(/^((.* )??i?frame\b\S*)(\s*.*)?$/)) {
      console.log('iframeSelectorParts', iframeSelectorParts)
      lastFramed = true
      const frameSelector = iframeSelectorParts[1]
      const childSelector = iframeSelectorParts[3]

      const matchingFrames = QueryProxy(frameSelector, session, timeout) // wait for frame to exist

      switch (matchingFrames.length) {
        case 0:
          throw new Error('no frames frames match selector: ' + frameSelector)
        case 1:
          console.log('waiting for frame to be ready:', frameSelector)

          let ready = false
          while (!ready) {
            ready = session.execute(({ frameSelector }) => {
              const iframe = jQuery(frameSelector).get(0)
              const doc = iframe.contentDocument || iframe.contentWindow.document;
              return (doc.readyState == 'complete' && doc.location.href !== 'about:blank')
            }, { frameSelector })
            $.wait(250)
          }

          console.log("frame ready")
          session.frame(matchingFrames.get(0))
          $.wait(3000)

          if (childSelector) {
            target = childSelector
          }
          break;
        default:
          throw new Error(`${matchingFrames.length} frames match selector: ${frameSelector}`)
      }
    }

    console.log("HERE", target, lastFramed)
    return QueryProxy(target, session, timeout)
  }

  $.go = url => {
    console.log('navigating to', url)
    session.frame(null)
    session.execute(url => (window.location.href = url), url)
  }
  $.refresh = () => session.execute(() => window.location.reload())
  $.back = () => session.execute(() => window.history.back())
  $.forward = () => session.execute(() => window.history.forward())

  let lastDownloads = []
  $.downloads = timeout => {
    if (typeof timeout !== 'undefined' && timeout <= 0)
      throw new Error('Timeout waiting for download')

    const newDownloads = fs
      .readdirSync(session.downloadPath)
      .filter(p => p.match(/^[^.]/)) // remove hidden files
      .filter(p => !p.match(/[.]crdownload$/)) // remove chrome tmp files
      .map(f => path.resolve(session.downloadPath, f))

    // if timeout is not given, then return immediately
    if (
      typeof timeout === 'undefined' ||
      lastDownloads.length !== newDownloads.length
    )
      return (lastDownloads = newDownloads)

    const delay = Math.min(timeout, 1000)
    sleep(delay)
    return $.downloads(timeout - delay)
  }

  $.wait = (ms, predicate, interval = 1000) => {
    const hasPredicate = typeof predicate === 'function'
    if (ms < 0) {
      if (hasPredicate)
        throw new Error(
          'Timeout waiting for predicate to return true: ' +
          predicate.toString()
        )
      return
    }

    // wait for a predicate to be true
    let result = hasPredicate ? session.execute(predicate) : false
    if (result) return result

    const start = Date.now()
    sleep(Math.min(ms, interval))
    return $.wait(ms - (Date.now() - start), predicate, interval)
  }

  $.screenshot = () => {
    const result = session.screenshot()
    const tmpResult = tmp.fileSync({ prefix: 'screenshot-', postfix: '.png' })
    const tmpPath = tmpResult.name
    fs.writeFileSync(tmpPath, result)
    return tmpPath
  }

  return $
}

function extractTimeout(args) {
  let wait = 30

  if (typeof args[0] === 'object') wait = args[0].wait || 30
  if (typeof args[0] === 'number') wait = args[0]

  return wait === -1 ? -1 : wait * 1000
}
