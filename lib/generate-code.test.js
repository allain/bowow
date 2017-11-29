const generateCode = require('./generate-code')

describe('generate-code', () => {
  it('generates default code based on usage', () =>
    expect(
      generateCode(
        'input[name=q]',
        [{ method: 'val', args: ['testing'] }, { method: 'text', args: [] }],
        30000
      )
    ).toEqual(
      `() => wait$("input[name=q]", {timeout: 30000}).then(els => els.val("testing").text())`
    ))

  it('can generate non waiting code when timeout is -1', () =>
    expect(
      generateCode(
        'input[name=q]',
        [{ method: 'val', args: ['testing'] }, { method: 'text', args: [] }],
        -1
      )
    ).toEqual(`() => jQuery("input[name=q]").val("testing").text()`))

  it('treats props appropritely', () =>
    expect(generateCode('input', [{ prop: 'length' }], 30000)).toEqual(
      `() => jQuery("input").length`
    ))
})
