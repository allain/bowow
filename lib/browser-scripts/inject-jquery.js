module.exports = () => {
  if (typeof jQuery !== 'undefined') return true

  const el = document.createElement('script')
  el.src = 'https://code.jquery.com/jquery-3.2.1.js'
  el.entegrity = 'sha256-DZAnKJ/6XZ9si04Hgrsxu/8s717jcIzLy3oi35EouyE='
  el.crossOrigin = 'anonymous'
  document.querySelector('body').appendChild(el)

  return new Promise((resolve, reject) => {
    let waiting = 0
    const waitId = setInterval(() => {
      if (typeof jQuery !== 'undefined') {
        clearInterval(waitId)
        return resolve()
      }

      waiting += 250
      if (waiting > 5000) {
        clearInterval(waitId)
        reject(new Error('Timeout waiting for jQuery'))
      }
    }, 250)
  })
}
