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
  return $('#res #search h3 > a')
    .map(function() {
      return $(this).attr('href')
    })
    .get()
}).then(console.log) // outputs an array of urls
