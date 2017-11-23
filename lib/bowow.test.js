const bowow = require('./bowow')

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

describe('bowow', () => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000

  it('bowow to be a function', () => expect(bowow).toBeInstanceOf(Function))

  describe('errors', () => {
    it('closes browser when passed function throws Error', () =>
      bowow($ => {
        throw new Error('err')
      }).catch(err => {
        expect(err.message).toEqual('err')
      }))

    it('closes browser when passed function throws Error', () =>
      bowow($ =>
        $(() => {
          throw new Error('err')
        })
      ).catch(err => {
        expect(err.message).toEqual('err')
      }))
  })

  it('passes a $ function as param', () =>
    bowow($ => expect($).toBeInstanceOf(Function)))

  it('function passed returns a Promise when invoked', () =>
    bowow($ => expect($(() => true)).toBeInstanceOf(Promise)))

  it('passes returned value back from bowow', () =>
    expect(bowow($ => 9)).resolves.toEqual(9))

  it('navigates to page when given a browser', () =>
    bowow(async $ => {
      await $.go('http://www.google.com')

      const title = await $(() => document.title)

      expect(title).toMatch(/Google/)
    }))

  it('supports refresh', () =>
    bowow(async $ => {
      await $.go('https://mea.favequest.net/ts')

      const ts1 = await $(() => document.body.innerText)
      await wait(1500)
      await $.refresh()
      const ts2 = await $(() => document.body.innerText)

      expect(ts1).not.toEqual(ts2)
    }))

  it('supports back and forward', () =>
    bowow(async $ => {
      await $.go('https://google.com')
      await $.go('https://digg.com')
      await $.back()

      expect(await $(() => document.title)).toMatch(/Google/)
      await $.forward()
      expect(await $(() => document.title)).toMatch(/Digg/)
    }))

  describe('browser js execution', () => {
    it('passing js code to $ invokes it in browser', () =>
      expect(bowow($ => $(() => window.navigator.appVersion))).resolves.toMatch(
        /Chromium/
      ))

    it('exceptions thrown get passed back', () =>
      bowow($ =>
        $(() => {
          throw new Error('testing')
        })
      ).then(
        () => {
          throw new Error('fail')
        },
        err => {
          expect(err).toBeInstanceOf(Error)
          expect(err.message).toEqual('testing')
        }
      ))

    it('unknown variables outside of function cause rejections', () => {
      let x = 0
      return bowow($ =>
        $(() => {
          console.log(x)
        })
      ).then(
        () => {
          throw new Error('fail')
        },
        err => {
          expect(err).toBeInstanceOf(Error)
          expect(err.message).toEqual('x is not defined')
        }
      )
    })

    it('arguments can be passed in', () =>
      bowow($ =>
        expect($(({ a, b }) => a + b, { a: 1, b: 2 })).resolves.toEqual(3)
      ))
  })

  describe.only('jQuery Proxy', () => {
    it('returns a proxy when passed a string', () =>
      bowow($ =>
        expect(
          $('input[name=q]')
            .val('testing')
            .toCode()
        ).toEqual('() => jQuery("input[name=q]").val("testing")')
      ))

    it('returns a proxy when passed a string', () =>
      bowow(async $ => {
        await $('https://www.bing.com')
        await $('input[name=q]').val('testing')
        await $('input[type=submit]').click()
        return expect($(() => document.title)).resolves.toEqual(
          'testing - Bing'
        )
      }))
  })
})
