const QueryProxy = require('./QueryProxy')

function mockSession() {
  return {
    execute: fn => Promise.resolve(fn.toString())
  }
}

describe('jQuery Proxy', () => {
  it('returns a chaninable promise/jQuery proxy', () => {
    const qp = QueryProxy('input[name=q]', mockSession())
    expect(qp).toBeInstanceOf(Promise)
    expect(qp.val).toBeInstanceOf(Function)
    expect(qp.val()).toBe(qp) // supports chaining
    expect(qp.val()).toBeInstanceOf(Promise) // supports chaining
  })

  describe('toCode', () => {
    it('toCode behaviour with default timeout', async () => {
      const qp = QueryProxy('input[name=q]', mockSession())

      expect(
        qp
          .val('testing')
          .text()
          .toCode()
      ).toEqual(
        '() => wait$("input[name=q]", {timeout: 30000}).then(els => els.val("testing").text())'
      )
    })

    it('toCode behaviour with 0 timeout', async () => {
      const qp = QueryProxy('input[name=q]', mockSession(), 0)

      expect(
        qp
          .val('testing')
          .text()
          .toCode()
      ).toEqual(
        '() => wait$("input[name=q]", {timeout: 0}).then(els => els.val("testing").text())'
      )
    })

    it('toCode behaviour with -1 timeout', async () => {
      const qp = QueryProxy('input[name=q]', mockSession(), -1)

      expect(
        qp
          .val('testing')
          .text()
          .toCode()
      ).toEqual('() => jQuery("input[name=q]").val("testing").text()')
    })
  })
})
