import { describe, expect, it } from 'vitest'
import { buildBookUrl, parseBookUrl } from '../../../src/shared/bookUrl'

describe('buildBookUrl', () => {
	it('puts the book id in the host and encodes each path segment', () => {
		expect(buildBookUrl(3, 'OEBPS/Images/my pic#1.png')).toBe('book://book-3/OEBPS/Images/my%20pic%231.png')
	})
})

describe('parseBookUrl', () => {
	it('parses book id and decoded entry path', () => {
		expect(parseBookUrl('book://book-12/OEBPS/Text/ch%201.xhtml')).toEqual({ bookId: 12, entryPath: 'OEBPS/Text/ch 1.xhtml' })
	})

	it('round-trips with buildBookUrl', () => {
		const entryPath = 'OPS/ünïcode/a b+c&d.xhtml'

		expect(parseBookUrl(buildBookUrl(7, entryPath))).toEqual({ bookId: 7, entryPath })
	})

	it('ignores query and fragment', () => {
		expect(parseBookUrl('book://book-1/ch1.xhtml?x=1#note')).toEqual({ bookId: 1, entryPath: 'ch1.xhtml' })
	})

	it('rejects other schemes and hosts', () => {
		expect(parseBookUrl('file:///C:/secret.txt')).toBeNull()
		expect(parseBookUrl('https://book-1/ch1.xhtml')).toBeNull()
		expect(parseBookUrl('book://1/ch1.xhtml')).toBeNull()
		expect(parseBookUrl('book://book-x/ch1.xhtml')).toBeNull()
		expect(parseBookUrl('not a url')).toBeNull()
	})

	it('resolves dot segments (plain or encoded) without climbing above the book root', () => {
		expect(parseBookUrl('book://book-1/OEBPS/%2E%2E/ch1.xhtml')?.entryPath).toBe('ch1.xhtml')
		expect(parseBookUrl('book://book-1/../../../ch1.xhtml')?.entryPath).toBe('ch1.xhtml')
		expect(parseBookUrl('book://book-1/OEBPS/./Text/ch1.xhtml')?.entryPath).toBe('OEBPS/Text/ch1.xhtml')
	})

	it('rejects empty paths and segments that decode to separators', () => {
		expect(parseBookUrl('book://book-1/')).toBeNull()
		expect(parseBookUrl('book://book-1')).toBeNull()
		expect(parseBookUrl('book://book-1/OEBPS//ch1.xhtml')).toBeNull()
		expect(parseBookUrl('book://book-1/OEBPS%2F..%2Fch1.xhtml')).toBeNull()
		expect(parseBookUrl('book://book-1/OEBPS%5Cch1.xhtml')).toBeNull()
		expect(parseBookUrl('book://book-1/%E0%A4%A')).toBeNull()
	})
})
