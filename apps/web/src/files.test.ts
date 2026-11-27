import { expect, test } from 'vitest'
import { parseCsv } from './files'

test('parseCsv handles quotes, CRLF, blank lines and TSV', () => {
  expect(parseCsv('a,b\r\n"x, y","say ""hi"""\n\n1,\n')).toEqual([['a', 'b'], ['x, y', 'say "hi"'], ['1', '']])
  expect(parseCsv('"multi\nline",2')).toEqual([['multi\nline', '2']])
  expect(parseCsv('a\tb\n1\t2', '\t')).toEqual([['a', 'b'], ['1', '2']])
})
