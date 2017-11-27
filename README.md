# Bowow

A micro-library for browser automation.

## Features

* Tiny API (1 function + some helpers)
* jQuery injection
* Built directly on the w3c-webdriver spec

## Usage

Search Google and return the first search result's url.

```js
const bowow = require('.')

bowow(async ($, $$) => {
  // Navigate to google
  await $('https://www.google.com')

  // Type in "example"
  await $('input[name=q]')
    .val('example')
    .blur()

  // Click on the Search button
  await $$(`input[type='button'][value='Google Search']`).click()

  // Extract the first link's url
  return $$('#res #search .srg h3:first').attr('href')
}).then(console.log)
```

## API

### `bowow(async ($, $$) => {...}) : Promise`

Accepts a function receiving `$` and `$$` params. `$` is the workhorse of the library, and $$ is a utility that behaves much like `$` but waits till elements match its selector. Failing if not found in the appropriate time.

### `$(fn : Function) : Promise`

This is the core of the library. The passed function will be executed in the context of the browser. Any returned value will be invoked as a returned as a resolving `Promise`.

### `$(selector: string) : jQueryPromise`

This is a helper that makes working with jQuery a trivial undertaking. When provided with a jQuery selector, `$` acts like jQuery would, except it is also a `Promise`, executing in the browser when it's invoked. I acknowledge that is a bit of magic, but being able to use jQuery without jumping through hoops is worth looking the other way.

Under the hood `$('input').val('test').blur()` gets transformed into `$(() => jQuery('input').val('test').blur())` but is much easier to think about.

### `$$(selector : string) : Promised + jQuery`
