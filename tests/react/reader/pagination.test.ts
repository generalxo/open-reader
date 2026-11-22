import { describe, expect, it } from 'vitest'
import { countPages, paginationCss } from '../../../src/reader/pagination'

describe('paginationCss', () => {
	it('makes each page one column with a stride of exactly the page width', () => {
		const css = paginationCss({ width: 700, height: 900, marginX: 24, marginY: 32 })

		// column (652) + gap (48) = 700
		expect(css).toContain('column-width: 652px !important')
		expect(css).toContain('column-gap: 48px !important')
		expect(css).toContain('height: 900px !important')
		expect(css).toContain('max-height: 836px !important')
	})

	it('never produces zero or negative sizes', () => {
		const css = paginationCss({ width: 20, height: 30, marginX: 24, marginY: 32 })

		expect(css).toContain('column-width: 1px !important')
		expect(css).toContain('max-height: 1px !important')
	})
})

describe('countPages', () => {
	it('counts pages from the scroll width', () => {
		expect(countPages(2100, 700)).toBe(3)
		expect(countPages(2101, 700)).toBe(3)
		expect(countPages(0, 700)).toBe(1)
		expect(countPages(2100, 0)).toBe(1)
	})
})
