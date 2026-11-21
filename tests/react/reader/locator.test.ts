import { describe, expect, it } from 'vitest'
import type { SpineItem } from '../../../src/types/models/spineItem'
import {
	clamp01,
	createLocator,
	fromTotalProgression,
	pageToProgression,
	parseLocator,
	progressionToPage,
	progressionToScroll,
	scrollToProgression,
	serializeLocator,
	spineWeights,
	toTotalProgression,
} from '../../../src/reader/locator'

const spine: SpineItem[] = [
	{ id: 'a', href: 'OEBPS/a.xhtml', size: 100 },
	{ id: 'b', href: 'OEBPS/b.xhtml', size: 300 },
	{ id: 'c', href: 'OEBPS/c.xhtml', size: 600 },
]

describe('clamp01', () => {
	it('clamps to 0..1 and treats NaN/Infinity as 0', () => {
		expect(clamp01(-1)).toBe(0)
		expect(clamp01(2)).toBe(1)
		expect(clamp01(0.4)).toBe(0.4)
		expect(clamp01(NaN)).toBe(0)
		expect(clamp01(Infinity)).toBe(0)
	})
})

describe('pages <-> progression', () => {
	it('maps the start of each page to i/n', () => {
		expect(pageToProgression(0, 4)).toBe(0)
		expect(pageToProgression(3, 4)).toBe(0.75)
	})

	it('treats single-page and empty chapters as progression 0 / page 0', () => {
		expect(pageToProgression(0, 1)).toBe(0)
		expect(progressionToPage(0.9, 1)).toBe(0)
		expect(progressionToPage(0.5, 0)).toBe(0)
	})

	it('round-trips every page for many page counts', () => {
		for (let count = 1; count <= 60; count++) {
			for (let page = 0; page < count; page++)
				expect(progressionToPage(pageToProgression(page, count), count)).toBe(page)
		}
	})

	it('maps chapter end to the last page', () => {
		expect(progressionToPage(1, 5)).toBe(4)
	})

	it('keeps the same text in view when the page count changes (e.g. resize)', () => {
		// Start of page 6 of 10 is 60% through; with 20 pages that text is on page 12
		expect(progressionToPage(pageToProgression(6, 10), 20)).toBe(12)
		// and with 7 pages it's on page 4 (covering 57%..71%)
		expect(progressionToPage(pageToProgression(6, 10), 7)).toBe(4)
	})
})

describe('scroll <-> progression', () => {
	it('uses the fraction of content above the viewport', () => {
		expect(scrollToProgression(250, 1000)).toBe(0.25)
		expect(scrollToProgression(0, 0)).toBe(0)
	})

	it('clamps scroll targets to the scrollable range', () => {
		expect(progressionToScroll(0.25, 1000, 400)).toBe(250)
		expect(progressionToScroll(0.9, 1000, 400)).toBe(600)
		expect(progressionToScroll(0.5, 300, 400)).toBe(0)
	})
})

describe('total progression', () => {
	it('weights chapters by size', () => {
		const weights = spineWeights(spine)

		expect(toTotalProgression(weights, 0, 0)).toBe(0)
		expect(toTotalProgression(weights, 1, 0)).toBe(0.1)
		expect(toTotalProgression(weights, 1, 0.5)).toBe(0.25)
		expect(toTotalProgression(weights, 2, 1)).toBe(1)
	})

	it('falls back to equal weights when a size is unknown', () => {
		expect(spineWeights([...spine, { id: 'd', href: 'd', size: 0 }])).toEqual([1, 1, 1, 1])
	})

	it('returns 0 for out-of-range indices and empty books', () => {
		expect(toTotalProgression([1, 1], 5, 0.5)).toBe(0)
		expect(toTotalProgression([], 0, 0.5)).toBe(0)
	})

	it('inverts toTotalProgression', () => {
		const weights = spineWeights(spine)

		expect(fromTotalProgression(weights, 0.25)).toEqual({ spineIndex: 1, progression: 0.5 })
		expect(fromTotalProgression(weights, 0)).toEqual({ spineIndex: 0, progression: 0 })
		expect(fromTotalProgression(weights, 1)).toEqual({ spineIndex: 2, progression: 1 })
		expect(fromTotalProgression([], 0.5)).toEqual({ spineIndex: 0, progression: 0 })
	})
})

describe('createLocator', () => {
	it('fills in href and total progression, clamping inputs', () => {
		expect(createLocator(spine, 1, 0.5)).toEqual({
			spineIndex: 1, href: 'OEBPS/b.xhtml', progression: 0.5, totalProgression: 0.25,
		})
		expect(createLocator(spine, 9, 3).spineIndex).toBe(2)
		expect(createLocator(spine, 9, 3).progression).toBe(1)
	})
})

describe('serializeLocator / parseLocator', () => {
	it('round-trips, keeping a cfi', () => {
		const locator = { ...createLocator(spine, 2, 0.3), cfi: 'epubcfi(/6/6!/4/2)' }

		expect(parseLocator(serializeLocator(locator), spine)).toEqual(locator)
	})

	it('prefers the href over a stale spine index', () => {
		const raw = JSON.stringify({ spineIndex: 0, href: 'OEBPS/c.xhtml', progression: 0.5 })

		expect(parseLocator(raw, spine)?.spineIndex).toBe(2)
	})

	it('falls back to the index when the href is unknown', () => {
		const raw = JSON.stringify({ spineIndex: 1, href: 'gone.xhtml', progression: 0.5 })

		expect(parseLocator(raw, spine)?.href).toBe('OEBPS/b.xhtml')
	})

	it('returns null for missing, malformed or out-of-range data', () => {
		expect(parseLocator(null, spine)).toBeNull()
		expect(parseLocator('', spine)).toBeNull()
		expect(parseLocator('{not json', spine)).toBeNull()
		expect(parseLocator('"text"', spine)).toBeNull()
		expect(parseLocator(JSON.stringify({ spineIndex: 1 }), spine)).toBeNull()
		expect(parseLocator(JSON.stringify({ spineIndex: 7, progression: 0 }), spine)).toBeNull()
		expect(parseLocator(serializeLocator(createLocator(spine, 0, 0)), [])).toBeNull()
	})
})
