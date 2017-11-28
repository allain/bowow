const chromeDriver = require('chromedriver')
const getPort = require('get-port')

const debug = require('debug')('bowow:chromedriver')

module.exports = async (args = []) => {
  const port = await getPort()

  debug('starting process')

  const driverProcess = require('child_process').execFile(
    chromeDriver.path,
    [`--port=${port}`].concat(args)
  )
  driverProcess.on('error', console.error)

  return Promise.resolve({
    ...chromeDriver,
    port,
    rootUrl: `http://localhost:${port}`,
    stop: () =>
      new Promise((resolve, reject) => {
        debug('stopping')
        driverProcess.once('exit', () => {
          debug('stopped')
          resolve()
        })
        driverProcess.once('error', reject)
        driverProcess.kill()
      })
  })
}
