import { describe, expect, it } from 'vitest'
import { chapterSrcdoc, mountChapter, parseChapter, sanitizeChapter } from '../../../src/reader/chapterDocument'

const XHTML = 'application/xhtml+xml'

function xhtml(head: string, body: string, attrs = ''): string {
	return `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en"><head>${head}</head><body ${attrs}>${body}</body></html>`
}

function emptyTarget(): Document {
	return new DOMParser().parseFromString(chapterSrcdoc('book://book-1/OEBPS/ch1.xhtml'), 'text/html')
}

describe('parseChapter', () => {
	it('parses XHTML as XML so self-closing tags do not swallow following content', () => {
		const doc = parseChapter(xhtml('', '<div id="anchor"/><p>after</p>'), XHTML)

		expect(doc.querySelector('#anchor')?.childNodes.length).toBe(0)
		expect(doc.querySelector('p')?.textContent).toBe('after')
	})

	it('falls back to the HTML parser for broken XML', () => {
		const doc = parseChapter('<html><body><p>unclosed<br></body></html>', XHTML)

		expect(doc.getElementsByTagName('parsererror')).toHaveLength(0)
		expect(doc.querySelector('p')?.textContent).toBe('unclosed')
	})

	it('uses the HTML parser for text/html content', () => {
		const doc = parseChapter('<p>plain', 'text/html; charset=utf-8')

		expect(doc.querySelector('p')?.textContent).toBe('plain')
	})
})

describe('sanitizeChapter', () => {
	it('removes scripts, base/meta and embedded frames', () => {
		const doc = parseChapter(xhtml('<meta charset="utf-8"/><base href="http://evil/"/><script>alert(1)</script>', '<p>x</p><iframe src="a.html"/><object data="a.swf"/>'), XHTML)
		sanitizeChapter(doc)

		expect(doc.querySelectorAll('script, base, meta, iframe, object')).toHaveLength(0)
		expect(doc.querySelector('p')?.textContent).toBe('x')
	})

	it('strips event handler attributes and javascript: URLs but keeps others', () => {
		const doc = parseChapter(xhtml('', '<img src="a.png" onerror="steal()" alt="pic"/><a href=" JavaScript:steal()" class="link">x</a>'), XHTML)
		sanitizeChapter(doc)

		const img = doc.querySelector('img')!
		const link = doc.querySelector('a')!
		expect(img.hasAttribute('onerror')).toBe(false)
		expect(img.getAttribute('alt')).toBe('pic')
		expect(link.hasAttribute('href')).toBe(false)
		expect(link.getAttribute('class')).toBe('link')
	})
})

describe('mountChapter', () => {
	it('copies head content, body content and html/body attributes', () => {
		const source = parseChapter(xhtml(
			'<title>Ch 1</title><link rel="stylesheet" href="../Styles/a.css"/><style>p{color:red}</style>',
			'<p>Hello</p>',
			'class="calibre" epub:type="bodymatter"',
		), XHTML)
		const target = emptyTarget()
		mountChapter(target, source)

		expect(target.documentElement.getAttribute('lang')).toBe('en')
		expect(target.body.getAttribute('class')).toBe('calibre')
		expect(target.body.getAttributeNS('http://www.idpf.org/2007/ops', 'type')).toBe('bodymatter')
		expect(target.head.querySelector('link')?.getAttribute('href')).toBe('../Styles/a.css')
		expect(target.head.querySelector('style')?.textContent).toBe('p{color:red}')
		expect(target.body.querySelector('p')?.textContent).toBe('Hello')
	})

	it('keeps the base element from the srcdoc first in head', () => {
		const target = emptyTarget()
		mountChapter(target, parseChapter(xhtml('<style>p{}</style>', ''), XHTML))

		expect(target.head.querySelector('base')?.getAttribute('href')).toBe('book://book-1/OEBPS/ch1.xhtml')
	})

	it('mounts documents without a body (e.g. SVG spine items) whole', () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>'
		const target = emptyTarget()
		mountChapter(target, parseChapter(svg, 'image/svg+xml'))

		expect(target.body.querySelector('rect')).not.toBeNull()
	})
})

describe('chapterSrcdoc', () => {
	it('escapes the base URL', () => {
		expect(chapterSrcdoc('book://book-1/a"b<c&d.xhtml')).toContain('href="book://book-1/a&quot;b&lt;c&amp;d.xhtml"')
	})
})
