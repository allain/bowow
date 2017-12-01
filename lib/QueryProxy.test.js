const QueryProxy = require('./QueryProxy')

const trimLeft = str => str.replace(/\n\s+/g, '\n')

function mockSession() {
  return {
    calls: [],
    execute: function(fn, args) {
      this.calls.push({ fn, args })
      return '$CHAIN$'
    }
  }
}

describe('jQuery Proxy', () => {
  it('defaults to waiting behaviour by default', async () => {
    const mock = mockSession()

    QueryProxy('input[name=q]', mock)
    expect(mock.calls.length).toEqual(1)
    expect(mock.calls[0].fn.toString()).toMatch(/wait\$/)
  })

  it('disables waiting when timeout = -1', async () => {
    const mock = mockSession()
    QueryProxy('input[name=q]', mock, -1)
    expect(mock.calls.length).toEqual(1)
    expect(mock.calls[0].fn.toString()).not.toMatch(/wait\$/)
  })

  it('waits when timeout = 0', async () => {
    const mock = mockSession()
    QueryProxy('input[name=q]', mock, 0)
    expect(mock.calls.length).toEqual(1)
    expect(mock.calls[0].fn.toString()).toMatch(/wait\$/)
  })

  it('filter supports string', async () => {
    const mock = mockSession()
    QueryProxy('a', mock, 0).filter('Test').length // eslint-disable-line
    expect(mock.calls.length).toEqual(3)
    expect(trimLeft(mock.calls[1].fn.toString())).toEqual(
      trimLeft(`({ proxyID }) => {
                      window[proxyID] = window[proxyID].filter(function() {
                        return $(this).text() === "Test"
                      })
                      return '$CHAIN$'
                    }`)
    )
  })

  it('filter supports regex', async () => {
    const mock = mockSession()
    QueryProxy('a', mock, 0).filter(/Test\b/).length // eslint-disable-line
    expect(mock.calls.length).toEqual(3)
    expect(trimLeft(mock.calls[1].fn.toString())).toEqual(
      trimLeft(`({ proxyID }) => {
                      window[proxyID] = window[proxyID].filter(function() {
                        return $(this).text().match(/Test\\b/)
                      })
                      return '$CHAIN$'
                    }`)
    )
  })

  describe('property access', () => {
    const props = ['length', 'jquery', 'selector']
    props.forEach(prop =>
      it(`executes correct code for ${prop} property`, () => {
        const mock = mockSession()
        const qp = QueryProxy('input[name=q]', mock, 0)
        qp[prop] // eslint-disable-line

        expect(mock.calls.length).toEqual(2)
        expect(mock.calls[1].fn.toString()).toEqual(
          '({ proxyID, prop }) => window[proxyID][prop]'
        )
        expect(mock.calls[1].args.prop).toEqual(prop)
      })
    )
  })
})
