// Next/previous decisions for paginated flow, kept free of DOM and React so they can be tested.

export interface PagePosition {
	spineIndex: number
	pageIndex: number
	pageCount: number | null // null while the chapter is still being laid out
}

// 'chapter' opens another chapter at a progression: 0 = first page, 1 = last page.
export type NavigationStep =
	| { type: 'page'; pageIndex: number }
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
