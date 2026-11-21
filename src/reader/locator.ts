import type { SpineItem } from '../types/models/spineItem'
import type { Locator } from './types'

// Guards against float error when converting back and forth (e.g. 3/7*7 = 2.9999999999999996).
const EPSILON = 1e-9

export function clamp01(value: number): number {
	if (!Number.isFinite(value))
		return 0

	return Math.min(1, Math.max(0, value))
}

// Paginated flow: page i of n starts at i/n of the chapter.
export function pageToProgression(pageIndex: number, pageCount: number): number {
	if (pageCount <= 1)
		return 0

	return clamp01(pageIndex / pageCount)
}

// The page that contains the given progression. 1 (chapter end) maps to the last page.
export function progressionToPage(progression: number, pageCount: number): number {
	if (pageCount <= 1)
		return 0

	const page = Math.floor(clamp01(progression) * pageCount + EPSILON)

	return Math.min(page, pageCount - 1)
}

// Scrolled flow: the fraction of the content above the top of the viewport.
// Uses the same meaning as pages, so a position maps to the same text in both flows.
export function scrollToProgression(scrollTop: number, scrollHeight: number): number {
	if (scrollHeight <= 0)
		return 0

	return clamp01(scrollTop / scrollHeight)
}

// The scrollTop that brings the given progression to the top of the viewport.
export function progressionToScroll(progression: number, scrollHeight: number, clientHeight: number): number {
	const maxScroll = Math.max(0, scrollHeight - clientHeight)

	return Math.min(maxScroll, clamp01(progression) * scrollHeight)
}

// Chapter weights for total progress. Falls back to equal weights if any size is unknown,
// since one zero-weight chapter would otherwise be skipped by the progress bar.
export function spineWeights(spine: SpineItem[]): number[] {
	if (spine.some((item) => item.size <= 0))
		return spine.map(() => 1)

	return spine.map((item) => item.size)
}

export function toTotalProgression(weights: number[], spineIndex: number, progression: number): number {
	const total = weights.reduce((sum, weight) => sum + weight, 0)
	if (total <= 0 || spineIndex < 0 || spineIndex >= weights.length)
		return 0

	const before = weights.slice(0, spineIndex).reduce((sum, weight) => sum + weight, 0)

	return clamp01((before + weights[spineIndex] * clamp01(progression)) / total)
}

// Inverse of toTotalProgression, e.g. for jumping from a progress slider.
export function fromTotalProgression(weights: number[], totalProgression: number): { spineIndex: number; progression: number } {
	const total = weights.reduce((sum, weight) => sum + weight, 0)
	if (total <= 0 || weights.length === 0)
		return { spineIndex: 0, progression: 0 }

	const target = clamp01(totalProgression) * total
	let before = 0

	for (let i = 0; i < weights.length; i++) {
		const weight = weights[i]
		if (target < before + weight || i === weights.length - 1)
			return { spineIndex: i, progression: weight > 0 ? clamp01((target - before) / weight) : 0 }

		before += weight
	}

	return { spineIndex: 0, progression: 0 }
}

export function createLocator(spine: SpineItem[], spineIndex: number, progression: number): Locator {
	const index = Math.min(Math.max(0, spineIndex), Math.max(0, spine.length - 1))
	const clamped = clamp01(progression)

	return {
		spineIndex: index,
		href: spine[index]?.href ?? '',
		progression: clamped,
		totalProgression: toTotalProgression(spineWeights(spine), index, clamped),
	}
}

// Stored in reading_progress.position.
export function serializeLocator(locator: Locator): string {
	return JSON.stringify(locator)
}

// Reads a stored position back. Returns null for missing or unreadable data.
// The href wins over the stored index, so a position still lands on the right chapter
// if the book's spine changed since it was saved; totalProgression is recomputed.
export function parseLocator(raw: string | null | undefined, spine: SpineItem[]): Locator | null {
	if (!raw || spine.length === 0)
		return null

	let data: unknown
	try {
		data = JSON.parse(raw)
	} catch {
		return null
	}

	if (typeof data !== 'object' || data === null)
		return null

	const { spineIndex, href, progression, cfi } = data as Record<string, unknown>
	if (typeof progression !== 'number')
		return null

	const hrefIndex = typeof href === 'string' ? spine.findIndex((item) => item.href === href) : -1
	const index = hrefIndex >= 0 ? hrefIndex : typeof spineIndex === 'number' && Number.isInteger(spineIndex) ? spineIndex : -1
	if (index < 0 || index >= spine.length)
		return null

	const locator = createLocator(spine, index, progression)
	if (typeof cfi === 'string')
		locator.cfi = cfi

	return locator
}
