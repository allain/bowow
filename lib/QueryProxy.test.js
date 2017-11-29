const QueryProxy = require('./QueryProxy')

function mockSession() {
  return {
    execute: fn => Promise.resolve(fn.toString())
  }
}

describe('jQuery Proxy', () => {
  it('returns a chaninable promise/jQuery proxy', () => {
    const qp = QueryProxy('input[name=q]', mockSession())
    expect(qp.val).toBeInstanceOf(Function)
    expect(qp.val()).toBe(qp) // supports chaining
  })

  it('defaults to waiting behaviour by default', async () => {
    const executes = []

    QueryProxy('input[name=q]', {
      execute: (fn, args) => executes.push({ fn, args })
    })
    expect(executes.length).toEqual(1)
    expect(executes[0].fn.toString()).toMatch(/wait\$/)
  })

  it('disables waiting when timeout = -1', async () => {
    const executes = []

    QueryProxy(
      'input[name=q]',
      {
        execute: (fn, args) => executes.push({ fn, args })
      },
      -1
    )

    expect(executes.length).toEqual(1)
    expect(executes[0].fn.toString()).not.toMatch(/wait\$/)
  })

  it('waits when timeout = 0', async () => {
    const executes = []

    QueryProxy(
      'input[name=q]',
      {
        execute: (fn, args) => executes.push({ fn, args })
      },
      0
    )

    expect(executes.length).toEqual(1)
    expect(executes[0].fn.toString()).toMatch(/wait\$/)
  })
})
