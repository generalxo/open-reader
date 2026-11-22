// Next/previous decisions for both reading flows, kept free of DOM and React so they can be tested.

export interface PagePosition {
	spineIndex: number
	pageIndex: number
	pageCount: number | null // null while the chapter is still being laid out
}

export interface ScrollPosition {
	spineIndex: number
	scrollTop: number
	scrollHeight: number
	clientHeight: number
}

// 'chapter' opens another chapter at a progression: 0 = start, 1 = end (last page / bottom).
export type NavigationStep =
	| { type: 'page'; pageIndex: number }
	| { type: 'scroll'; scrollTop: number }
	| { type: 'chapter'; spineIndex: number; progression: 0 | 1 }
	| { type: 'none' }

const NONE: NavigationStep = { type: 'none' }

// Ignores input while the chapter has no page count yet; otherwise a fast key press during
// loading would skip the whole chapter.
export function nextStep(position: PagePosition, spineLength: number): NavigationStep {
	const { spineIndex, pageIndex, pageCount } = position
	if (pageCount === null)
		return NONE

	if (pageIndex < pageCount - 1)
		return { type: 'page', pageIndex: pageIndex + 1 }

	if (spineIndex < spineLength - 1)
		return { type: 'chapter', spineIndex: spineIndex + 1, progression: 0 }

	return NONE
}

export function prevStep(position: PagePosition): NavigationStep {
	const { spineIndex, pageIndex, pageCount } = position
	if (pageCount === null)
		return NONE

	if (pageIndex > 0)
		return { type: 'page', pageIndex: pageIndex - 1 }

	if (spineIndex > 0)
		return { type: 'chapter', spineIndex: spineIndex - 1, progression: 1 }

	return NONE
}

export function isAtStart(position: PagePosition): boolean {
	return position.spineIndex === 0 && position.pageIndex === 0
}

export function isAtEnd(position: PagePosition, spineLength: number): boolean {
	const { spineIndex, pageIndex, pageCount } = position

	return pageCount !== null && spineIndex === spineLength - 1 && pageIndex >= pageCount - 1
}

// Scrolled flow: one step is most of a screen, keeping a little overlap so the reader doesn't
// lose their line.
const SCROLL_STEP = 0.9

// Sub-pixel scroll positions mean the bottom is rarely reached exactly
const EDGE_TOLERANCE_PX = 2

export function isScrolledToTop(position: ScrollPosition): boolean {
	return position.scrollTop <= EDGE_TOLERANCE_PX
}

export function isScrolledToBottom(position: ScrollPosition): boolean {
	return position.scrollTop + position.clientHeight >= position.scrollHeight - EDGE_TOLERANCE_PX
}

export function nextScrollStep(position: ScrollPosition, spineLength: number): NavigationStep {
	if (!isScrolledToBottom(position)) {
		const maxScroll = Math.max(0, position.scrollHeight - position.clientHeight)

		return { type: 'scroll', scrollTop: Math.min(maxScroll, position.scrollTop + position.clientHeight * SCROLL_STEP) }
	}

	if (position.spineIndex < spineLength - 1)
		return { type: 'chapter', spineIndex: position.spineIndex + 1, progression: 0 }

	return NONE
}

export function prevScrollStep(position: ScrollPosition): NavigationStep {
	if (!isScrolledToTop(position))
		return { type: 'scroll', scrollTop: Math.max(0, position.scrollTop - position.clientHeight * SCROLL_STEP) }

	if (position.spineIndex > 0)
		return { type: 'chapter', spineIndex: position.spineIndex - 1, progression: 1 }

	return NONE
}
