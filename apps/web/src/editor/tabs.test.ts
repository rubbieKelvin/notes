import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { addTab, fieldOf, readTabs, removeTab, renameTab, tabsOf } from './tabs'

describe('note tabs', () => {
  it('a note without tabs is one tab on the original fragment', () => {
    expect(readTabs(new Y.Doc())).toEqual([{ id: 'default', title: '' }])
    expect(fieldOf('default')).toBe('default')
    expect(fieldOf('ab12')).toBe('tab:ab12')
  })

  it('the first added tab also writes down the original one; removing a tab clears its content', () => {
    const doc = new Y.Doc()
    const id = addTab(doc, 'Budget')
    expect(readTabs(doc)).toEqual([{ id: 'default', title: '' }, { id, title: 'Budget' }])
    renameTab(doc, id, 'Costs')
    doc.getXmlFragment(fieldOf(id)).insert(0, [new Y.XmlElement('paragraph')])
    expect(readTabs(doc)[1].title).toBe('Costs')
    removeTab(doc, id)
    expect(readTabs(doc)).toEqual([{ id: 'default', title: '' }])
    expect(doc.getXmlFragment(fieldOf(id)).length).toBe(0)
  })

  it('ignores a tab two clients added at once', () => {
    const doc = new Y.Doc()
    tabsOf(doc).push(['default', 'default', 'x'].map((id) => new Y.Map(Object.entries({ id, title: id }))))
    expect(readTabs(doc).map((t) => t.id)).toEqual(['default', 'x'])
  })
})
