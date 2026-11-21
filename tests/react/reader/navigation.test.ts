import { describe, expect, it } from 'vitest'
import { isAtEnd, isAtStart, nextStep, prevStep } from '../../../src/reader/navigation'

const SPINE_LENGTH = 3

describe('nextStep', () => {
	it('moves to the next page inside a chapter', () => {
		expect(nextStep({ spineIndex: 0, pageIndex: 1, pageCount: 4 }, SPINE_LENGTH)).toEqual({ type: 'page', pageIndex: 2 })
	})

	it('opens the next chapter at its start from the last page', () => {
		expect(nextStep({ spineIndex: 0, pageIndex: 3, pageCount: 4 }, SPINE_LENGTH))
			.toEqual({ type: 'chapter', spineIndex: 1, progression: 0 })
	})

	it('does nothing on the last page of the book', () => {
		expect(nextStep({ spineIndex: 2, pageIndex: 3, pageCount: 4 }, SPINE_LENGTH)).toEqual({ type: 'none' })
	})

	it('does nothing while the chapter is still laying out', () => {
		expect(nextStep({ spineIndex: 0, pageIndex: 0, pageCount: null }, SPINE_LENGTH)).toEqual({ type: 'none' })
	})
})

describe('prevStep', () => {
	it('moves to the previous page inside a chapter', () => {
		expect(prevStep({ spineIndex: 1, pageIndex: 2, pageCount: 4 })).toEqual({ type: 'page', pageIndex: 1 })
	})

	it('opens the previous chapter at its end from the first page', () => {
		expect(prevStep({ spineIndex: 1, pageIndex: 0, pageCount: 4 }))
			.toEqual({ type: 'chapter', spineIndex: 0, progression: 1 })
	})

	it('does nothing on the first page of the book or while laying out', () => {
		expect(prevStep({ spineIndex: 0, pageIndex: 0, pageCount: 4 })).toEqual({ type: 'none' })
		expect(prevStep({ spineIndex: 1, pageIndex: 0, pageCount: null })).toEqual({ type: 'none' })
	})
})

describe('isAtStart / isAtEnd', () => {
	it('detects the book boundaries', () => {
		expect(isAtStart({ spineIndex: 0, pageIndex: 0, pageCount: 3 })).toBe(true)
		expect(isAtStart({ spineIndex: 1, pageIndex: 0, pageCount: 3 })).toBe(false)
		expect(isAtEnd({ spineIndex: 2, pageIndex: 2, pageCount: 3 }, SPINE_LENGTH)).toBe(true)
		expect(isAtEnd({ spineIndex: 2, pageIndex: 1, pageCount: 3 }, SPINE_LENGTH)).toBe(false)
		expect(isAtEnd({ spineIndex: 2, pageIndex: 0, pageCount: null }, SPINE_LENGTH)).toBe(false)
	})
})
