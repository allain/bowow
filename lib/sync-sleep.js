#!/usr/bin/env node

const childProcess = require('child_process')
const toInt = x => parseInt('' + (x || 0), 10)

function syncSleep(ms) {
  return childProcess.execSync(`${__filename} ${ms} ${Date.now()}`)
}

if (require.main === module) {
  const [ms = 1000, callTime = Date.now()] = process.argv.slice(2).map(toInt)
  const startDelay = Date.now() - callTime
  setTimeout(() => process.exit(0), 1, ms - startDelay)
}

module.exports = syncSleep
