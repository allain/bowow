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

  it('generates default code based on usage', () =>
    expect(
      QueryProxy('input[name=q]', mockSession())
        .val('testing')
        .text()
        .toCode()
    ).toEqual(
      `() => wait$("input[name=q]", {timeout: 30000}).then(els => els.val("testing").text())`
    ))

  it('can generate non waiting code when timeout is -1', () =>
    expect(
      QueryProxy('input[name=q]', mockSession(), { wait: -1 })
        .val('testing')
        .text()
        .toCode()
    ).toEqual(`() => jQuery("input[name=q]").val("testing").text()`))

  it('treats length property appropritely', () =>
    expect(
      QueryProxy('input', mockSession(), { wait: -1 }).length.toCode()
    ).toEqual(`() => jQuery("input").length`))
})
