# Bowow

A micro-library for browser automation.

## Features

* Tiny API (1 function + some helpers)
* jQuery is always available
* Synchronous API
* Built directly on the [w3c-webdriver spec](https://w3c.github.io/webdriver/webdriver-spec.html).

## Example Usage

Thie example searches Google and returns the list of urls returned on the first page.

```js
const bowow = require('.')

bowow($ => {
  // Navigate to google
  $('https://www.google.com')

  // Type in "example"
  $('input[name=q]')
    .val('example')
    .blur()

  // Click on the Search button
  $(`input[type='button'][value='Google Search']`).click()

  // collect all links in search results
  return $('#res #search h3 > a').map((index, e) => $(e).attr('href'))
}).then(console.log) // outputs an array of urls
```

## API

### `bowow($ => {...}) : Promise`

Accepts a function receiving a jQueryProxy.

### `$(fn : Function)`

This is the core of the library. It performs the passed function in the browser context and returns the value the function returns.

### `$(selector, timeout = 30) : jQueryProxy`

This is a helper that makes working with jQuery a trivial undertaking. When provided with a jQuery selector, `$` acts like jQuery would, except it throws an exception if the selector fails to match any elements within the specifies timeout (in seconds). If you want to disable that check, pass in -1 as the timeout value.

### $(selector).type('text')
