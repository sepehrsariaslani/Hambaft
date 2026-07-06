import { getMountElement } from '../app/mount'

describe('getMountElement', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('uses #root when present', () => {
    document.body.innerHTML = '<div id="root"></div><div id="app"></div>'

    expect(getMountElement()).toBe(document.getElementById('root'))
  })

  it('falls back to #app for legacy frappe templates', () => {
    document.body.innerHTML = '<div id="app"></div>'

    expect(getMountElement()).toBe(document.getElementById('app'))
  })

  it('throws a clear error when no mount container exists', () => {
    expect(() => getMountElement()).toThrow('Hambaft mount container not found. Expected #root or #app.')
  })
})
