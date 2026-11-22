import { describe, expect, it } from 'vitest'
import { isAtEnd, isAtStart, isScrolledToBottom, isScrolledToTop, nextScrollStep, nextStep, prevScrollStep, prevStep } from '../../../src/reader/navigation'

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

// A 1000px tall chapter in a 400px viewport; the bottom is at scrollTop 600
const scroll = (spineIndex: number, scrollTop: number) => ({ spineIndex, scrollTop, scrollHeight: 1000, clientHeight: 400 })

describe('nextScrollStep', () => {
	it('scrolls most of a screen, never past the bottom', () => {
		expect(nextScrollStep(scroll(0, 0), SPINE_LENGTH)).toEqual({ type: 'scroll', scrollTop: 360 })
		expect(nextScrollStep(scroll(0, 500), SPINE_LENGTH)).toEqual({ type: 'scroll', scrollTop: 600 })
	})

	it('opens the next chapter at its start from the bottom', () => {
		expect(nextScrollStep(scroll(0, 599), SPINE_LENGTH)).toEqual({ type: 'chapter', spineIndex: 1, progression: 0 })
	})

	it('does nothing at the bottom of the last chapter', () => {
		expect(nextScrollStep(scroll(2, 600), SPINE_LENGTH)).toEqual({ type: 'none' })
	})

	it('moves on from chapters shorter than the viewport', () => {
		expect(nextScrollStep({ spineIndex: 0, scrollTop: 0, scrollHeight: 300, clientHeight: 400 }, SPINE_LENGTH))
			.toEqual({ type: 'chapter', spineIndex: 1, progression: 0 })
	})
})

describe('prevScrollStep', () => {
	it('scrolls most of a screen up, never past the top', () => {
		expect(prevScrollStep(scroll(1, 600))).toEqual({ type: 'scroll', scrollTop: 240 })
		expect(prevScrollStep(scroll(1, 100))).toEqual({ type: 'scroll', scrollTop: 0 })
	})

	it('opens the previous chapter at its end from the top', () => {
		expect(prevScrollStep(scroll(1, 1))).toEqual({ type: 'chapter', spineIndex: 0, progression: 1 })
	})

	it('does nothing at the top of the first chapter', () => {
		expect(prevScrollStep(scroll(0, 0))).toEqual({ type: 'none' })
	})
})

describe('scroll edges', () => {
	it('allows a couple of pixels of tolerance', () => {
		expect(isScrolledToTop(scroll(0, 2))).toBe(true)
		expect(isScrolledToTop(scroll(0, 3))).toBe(false)
		expect(isScrolledToBottom(scroll(0, 598))).toBe(true)
		expect(isScrolledToBottom(scroll(0, 597))).toBe(false)
	})
})
