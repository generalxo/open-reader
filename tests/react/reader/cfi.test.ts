import { describe, expect, it } from 'vitest'
import {
	buildCfi,
	cfiPathFromPoint,
	cfiRangePath,
	isRangePath,
	parseCfi,
	pointFromCfiPath,
	rangeFromCfiRangePath,
	resolveCfiSpineIndex,
} from '../../../src/reader/cfi'

function chapter(body: string): Document {
	return new DOMParser().parseFromString(`<!DOCTYPE html><html><head><title>t</title></head><body>${body}</body></html>`, 'text/html')
}

const BODY = '<h1 id="title">Chapter <em>One</em></h1><p>First <b>bold</b> text.</p><p id="p2">Second</p><img src="a.png"><p>Tail</p>'

describe('cfiPathFromPoint', () => {
	it('builds element steps with id assertions and text offsets', () => {
		const doc = chapter(BODY)
		const first = doc.querySelectorAll('p')[0]

		// body is /4; the first <p> is the 2nd element of body (/4); "First " is run /1
		expect(cfiPathFromPoint(first.firstChild!, 3)).toBe('/4/4/1:3')
		// " text." is the run after <b> (/3)
		expect(cfiPathFromPoint(first.lastChild!, 2)).toBe('/4/4/3:2')
		expect(cfiPathFromPoint(doc.getElementById('p2')!.firstChild!, 0)).toBe('/4/6[p2]/1:0')
		expect(cfiPathFromPoint(doc.querySelector('img')!, 0)).toBe('/4/8')
	})

	it('counts adjacent text nodes as one run', () => {
		const doc = chapter('<p id="p">ab</p>')
		const p = doc.getElementById('p')!
		p.appendChild(doc.createTextNode('cd'))

		expect(cfiPathFromPoint(p.lastChild!, 1)).toBe('/4/2[p]/1:3')
	})

	it('maps a position between children to the child after it', () => {
		const doc = chapter(BODY)

		expect(cfiPathFromPoint(doc.body, 1)).toBe('/4/4')
		expect(cfiPathFromPoint(doc.getElementById('p2')!, 0)).toBe('/4/6[p2]/1:0')
	})

	it('escapes special characters in id assertions', () => {
		const doc = chapter('<p id="a[1],b">x</p>')

		expect(cfiPathFromPoint(doc.querySelector('p')!.firstChild!, 0)).toBe('/4/2[a^[1^]^,b]/1:0')
	})

	it('returns null for detached nodes', () => {
		const doc = chapter('')

		expect(cfiPathFromPoint(doc.createTextNode('x'), 0)).toBeNull()
	})
})

describe('pointFromCfiPath', () => {
	it('round-trips every text position in a mixed document', () => {
		const doc = chapter(BODY)
		const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)

		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			const length = (node as Text).data.length
			for (let offset = 0; offset <= length; offset++) {
				const path = cfiPathFromPoint(node, offset)!
				const point = pointFromCfiPath(doc, path)

				expect(point).toEqual({ node, offset })
			}
		}
	})

	it('prefers id assertions over indices when elements before the target changed', () => {
		const doc = chapter(BODY)
		const path = cfiPathFromPoint(doc.getElementById('p2')!.firstChild!, 3)!
		doc.body.insertBefore(doc.createElement('div'), doc.body.firstChild)

		expect(pointFromCfiPath(doc, path)).toEqual({ node: doc.getElementById('p2')!.firstChild, offset: 3 })
	})

	it('clamps offsets past the end of a run', () => {
		const doc = chapter('<p>abc</p>')

		expect(pointFromCfiPath(doc, '/4/2/1:99')).toEqual({ node: doc.querySelector('p')!.firstChild, offset: 3 })
	})

	it('resolves element paths to the element', () => {
		const doc = chapter(BODY)

		expect(pointFromCfiPath(doc, '/4/8')).toEqual({ node: doc.querySelector('img'), offset: 0 })
	})

	it('returns null for malformed or unresolvable paths', () => {
		const doc = chapter(BODY)

		expect(pointFromCfiPath(doc, '')).toBeNull()
		expect(pointFromCfiPath(doc, 'nonsense')).toBeNull()
		expect(pointFromCfiPath(doc, '/4/40')).toBeNull()
		expect(pointFromCfiPath(doc, '/4/1:0/2')).toBeNull()
	})
})

describe('range paths', () => {
	it('round-trips a selection across elements', () => {
		const doc = chapter(BODY)
		const first = doc.querySelectorAll('p')[0]
		const range = doc.createRange()
		range.setStart(first.firstChild!, 2)
		range.setEnd(doc.getElementById('p2')!.firstChild!, 3)

		const path = cfiRangePath(range)!
		expect(path).toBe('/4,/4/1:2,/6[p2]/1:3')
		expect(isRangePath(path)).toBe(true)

		const resolved = rangeFromCfiRangePath(doc, path)!
		expect(resolved.toString()).toBe(range.toString())
		expect(resolved.toString()).toBe('rst bold text.Sec')
	})

	it('keeps the shared parent for selections inside one paragraph', () => {
		const doc = chapter(BODY)
		const first = doc.querySelectorAll('p')[0]
		const range = doc.createRange()
		range.setStart(first.firstChild!, 0)
		range.setEnd(first.lastChild!, 5)

		expect(cfiRangePath(range)).toBe('/4/4,/1:0,/3:5')
		expect(rangeFromCfiRangePath(doc, '/4/4,/1:0,/3:5')!.toString()).toBe('First bold text')
	})

	it('treats escaped commas inside assertions as part of the step', () => {
		const doc = chapter('<p id="a,b">hello</p>')
		const text = doc.querySelector('p')!.firstChild!
		const range = doc.createRange()
		range.setStart(text, 1)
		range.setEnd(text, 4)

		const path = cfiRangePath(range)!
		expect(path).toBe('/4/2[a^,b],/1:1,/1:4')
		expect(rangeFromCfiRangePath(doc, path)!.toString()).toBe('ell')
	})

	it('rejects point paths and broken ranges', () => {
		expect(isRangePath('/4/2/1:0')).toBe(false)
		expect(rangeFromCfiRangePath(chapter(BODY), '/4/2/1:0')).toBeNull()
		expect(rangeFromCfiRangePath(chapter(BODY), '/4,/40,/42')).toBeNull()
	})
})

describe('buildCfi / parseCfi', () => {
	it('round-trips with the spine itemref as package step', () => {
		const cfi = buildCfi(1, 'chap(2)', '/4/2/1:5')

		expect(cfi).toBe('epubcfi(/6/4[chap^(2^)]!/4/2/1:5)')
		expect(parseCfi(cfi)).toEqual({ spineIndex: 1, spineId: 'chap(2)', path: '/4/2/1:5' })
	})

	it('keeps range paths intact', () => {
		expect(parseCfi('epubcfi(/6/2!/4,/2/1:0,/4/1:3)')).toEqual({ spineIndex: 0, spineId: null, path: '/4,/2/1:0,/4/1:3' })
	})

	it('rejects malformed CFIs', () => {
		expect(parseCfi('')).toBeNull()
		expect(parseCfi('/6/4!/4')).toBeNull()
		expect(parseCfi('epubcfi(/6/4)')).toBeNull()
		expect(parseCfi('epubcfi(/6/3!/4)')).toBeNull()
		expect(parseCfi('epubcfi(/6/4!)')).toBeNull()
	})

	it('resolves the spine index by id first, then by position', () => {
		const spine = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

		expect(resolveCfiSpineIndex({ spineIndex: 0, spineId: 'c', path: '/4' }, spine)).toBe(2)
		expect(resolveCfiSpineIndex({ spineIndex: 1, spineId: 'gone', path: '/4' }, spine)).toBe(1)
		expect(resolveCfiSpineIndex({ spineIndex: 9, spineId: null, path: '/4' }, spine)).toBeNull()
	})
})
