const bowow = require('.')

bowow(async ($, $$) => {
  await $('https://www.bing.com')

  await $('input[name=q]')
    .val('testing')
    .then(result => console.log('jquery promise', result))

  await $$('input[type=submit]').click()
})
