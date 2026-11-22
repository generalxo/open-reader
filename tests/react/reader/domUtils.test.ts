import { afterEach, describe, expect, it } from 'vitest'
import { closestLink, isImage, linkHref } from '../../../src/reader/domUtils'

// The engine's chapter lives in an iframe, which has its own JS realm: its nodes are not
// `instanceof` the app's Element/HTMLImageElement. These tests use a real iframe realm.
function iframeDocument(html: string): Document {
	const frame = document.createElement('iframe')
	document.body.appendChild(frame)
	const doc = frame.contentDocument!
	doc.body.innerHTML = html

	return doc
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('cross-realm DOM checks', () => {
	it('is a real cross-realm setup (the bug this guards against)', () => {
		const doc = iframeDocument('<a href="ch2.xhtml">x</a>')

		expect(doc.querySelector('a') instanceof Element).toBe(false)
	})

	it('closestLink finds the link around a click target from another realm', () => {
		const doc = iframeDocument('<p><a href="ch2.xhtml#n1"><span id="inner">note</span></a></p><p id="plain">text</p>')

		expect(closestLink(doc.getElementById('inner'))?.getAttribute('href')).toBe('ch2.xhtml#n1')
		expect(closestLink(doc.getElementById('plain'))).toBeNull()
		expect(closestLink(doc.getElementById('inner')!.firstChild)).not.toBeNull()
		expect(closestLink(null)).toBeNull()
	})

	it('linkHref reads href and SVG xlink:href', () => {
		const doc = iframeDocument('<a id="html" href="a.xhtml">a</a><svg><a id="svg" xlink:href="b.xhtml"><text>b</text></a></svg>')

		expect(linkHref(doc.getElementById('html')!)).toBe('a.xhtml')
		expect(linkHref(doc.getElementById('svg')!)).toBe('b.xhtml')
	})

	it('isImage recognises images from another realm', () => {
		const doc = iframeDocument('<img id="i" src="data:,"><p id="p"></p>')

		expect(isImage(doc.getElementById('i'))).toBe(true)
		expect(isImage(doc.getElementById('p'))).toBe(false)
		expect(isImage(null)).toBe(false)
	})
})
