const bowow = require('..')

bowow(async $ => {
  $('https://bing.com')
  $('input[name=q]').val('testing')
  $('input[type=submit]').click()

  $('#b_results')

  return $(() => document.title)
}).then(console.log)
