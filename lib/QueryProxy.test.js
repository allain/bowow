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

  it('can generate code matching the proxy calls', () =>
    expect(
      QueryProxy('input[name=q]', mockSession())
        .val('testing')
        .text()
        .toCode()
    ).toEqual(`() => jQuery("input[name=q]").val("testing").text()`))

  it('can generates waiting code when required is set to true', () =>
    expect(
      QueryProxy('input[name=q]', mockSession(), true)
        .val('testing')
        .text()
        .toCode()
    ).toEqual(
      `() => $$("input[name=q]").then(els => els.val("testing").text())`
    ))
})
