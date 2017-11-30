const bowow = require('..')

bowow($ => {
  // Navigate to google
  $('https://www.google.com')

  // Type in "example"
  $('input[name=q]')
    .type('example')
    .blur()

  // Click on the Search button
  $(`input[value='Google Search']`).click()

  // collect all links in search results
  const urls = $('#res #search h3 > a').map((index, e) => $(e).attr('href'))

  return urls
}).then(console.log) // outputs an array of urls
