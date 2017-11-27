# Bowow

A micro-library for browser automation.

## Features

* Tiny API (1 function + some helpers)
* jQuery always available
* Built directly on the [w3c-webdriver spec](https://w3c.github.io/webdriver/webdriver-spec.html).

## Example Usage

Thie example searches Google and returns the list of urls returned on the first page.

```js
const bowow = require('.')

bowow(async $ => {
  // Navigate to google
  await $('https://www.google.com')

  // Type in "example"
  await $('input[name=q]')
    .val('example')
    .blur()

  // Click on the Search button
  await $(`input[type='button'][value='Google Search']`).click()

  // collect all links in search results
  return $('#res #search h3 > a').map((index, e) => $(e).attr('href'))
}).then(console.log) // outputs an array of urls
```

## API

### `bowow(async $ => {...}) : Promise`

Accepts a function receiving `$`. `$` is the workhorse of the library.

### `$(fn : Function) : Promise`

This is the core of the library. The passed function will be executed in the context of the browser. Any returned value will be invoked as a returned as a resolving `Promise`. All other thigns this library does delegate to this under the hood.

### `$(selector, wait = 30) : jQueryPromise`

This is a helper that makes working with jQuery a trivial undertaking. When provided with a jQuery selector, `$` acts like jQuery would, except it is also a `Promise` that executes in the browser whenever it's asked to `then`. I acknowledge that is a **bit of magic**<sup>tm</sup> but being able to use jQuery without jumping through hoops is worth looking the other way.

Under the hood `$('input').val('test').blur()` gets transformed into `$(() => wait$('input', {timeout: 30000}).then(els =>  els.val('test').blur()))` but is much easier to think about. If you don't like **magic**, feel free to expand it yourself.

`wait` tells the jQuery Proxy to wait this many seconds before Timing out. -1 tells the Proxy that the code should execute immediately, and not fail is no elements match it (how jQuery would behave normally).
