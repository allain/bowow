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

  it('passes returned value back from bowow', () =>
    expect(bowow($ => 9)).resolves.toEqual(9))

  it('navigates to page when given a browser', () =>
    bowow(async $ => {
      $.go('http://www.google.com')

      const title = $(() => document.title)

      expect(title).toMatch(/Google/)
    }))

  it('supports refresh', () =>
    bowow(async $ => {
      $.go('https://mea.favequest.net/ts')

      const ts1 = $(() => document.body.innerText)

      await wait(1500)
      $.refresh()

      const ts2 = $(() => document.body.innerText)

      expect(ts1).not.toEqual(ts2)
    }))

  it('supports back and forward', () =>
    bowow(async $ => {
      $.go('https://google.com')
      $.go('https://digg.com')
      $.back()

      expect($(() => document.title)).toMatch(/Google/)
      $.forward()
      expect($(() => document.title)).toMatch(/Digg/)
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
      return bowow($ => $(() => console.log(x))).then(
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
      bowow($ => expect($(({ a, b }) => a + b, { a: 1, b: 2 })).toEqual(3)))
  })

  describe('jQuery usage', () => {
    it('invokes jQuery when invoked directly', () =>
      bowow(async $ => {
        $('https://bing.com')
        $('input[name=q]').val('testing')
        $('input[type=submit]').click()

        $('#b_results')
        return $(() => document.title)
      }).then(title => expect(title).toEqual('testing - Bing')))

    it('returns simple values when using jQuery getters', () =>
      bowow(async $ => {
        $('https://bing.com')
        return expect(
          $('input[name=q]')
            .val('testing')
            .val()
        ).toEqual('testing')
      }))

    it('map behaves as expected', () =>
      bowow(async $ => {
        $('https://www.google.com')

        const urls = $('a')
          .map((i, el) => $(el).attr('href'))
          .get()
        expect(Array.isArray(urls)).toEqual(true)

        const parents = $('a').map((i, el) => $(el).parent())

        expect(typeof parents.jquery).toEqual('string')
      }))
  })

  describe.only('downloads', () => {
    it('returns list of downloaded files synchronously', () =>
      bowow($ => expect($.downloads()).toEqual([])))
  })
})
