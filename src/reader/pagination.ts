// CSS for the chapter iframe. Defaults go first in <head> so the book's own CSS overrides them;
// the layout goes last and uses !important because pagination breaks if a book changes it.

export interface PageLayout {
	width: number   // iframe width in px; one page per width
	height: number  // iframe height in px
	marginX: number // left/right padding of each page
	marginY: number // top/bottom padding of each page
}

// Baseline for books that leave these unset. Colours and user overrides come from settingsCss.
export const READER_DEFAULTS_CSS = `
html {
	line-height: 1.6;
}
body {
	margin: 0;
}
`

// Each page is one CSS column. Columns are the page width minus the side margins, and the gap
// is both margins, so page i always starts at exactly i * width.
export function paginationCss({ width, height, marginX, marginY }: PageLayout): string {
	const columnWidth = Math.max(1, width - marginX * 2)
	const contentHeight = Math.max(1, height - marginY * 2)

	return `
html {
	box-sizing: border-box !important;
	width: ${width}px !important;
	height: ${height}px !important;
	margin: 0 !important;
	padding: ${marginY}px ${marginX}px !important;
	column-width: ${columnWidth}px !important;
	column-gap: ${marginX * 2}px !important;
	column-fill: auto !important;
	overflow: hidden !important;
}
img, svg, video, canvas {
	max-width: 100% !important;
	max-height: ${contentHeight}px !important;
	object-fit: contain;
	box-sizing: border-box;
}
img, svg, video, figure, table {
	break-inside: avoid;
}
`
}

// Scrolled flow: the chapter is one long column that scrolls inside the iframe. The scrollbar is
// hidden (progress is shown by the reader UI); Chromium's scroll anchoring keeps the text in place
// when images above the viewport finish loading.
export function scrolledCss({ height, marginX, marginY }: PageLayout): string {
	const contentHeight = Math.max(1, height - marginY * 2)

	return `
html {
	box-sizing: border-box !important;
	height: auto !important;
	margin: 0 !important;
	padding: ${marginY}px ${marginX}px !important;
	columns: auto !important;
	overflow-x: hidden !important;
	overflow-y: auto !important;
	scrollbar-width: none;
}
img, svg, video, canvas {
	max-width: 100% !important;
	max-height: ${contentHeight}px !important;
	object-fit: contain;
	box-sizing: border-box;
}
`
}

export function countPages(scrollWidth: number, width: number): number {
	if (width <= 0)
		return 1

	return Math.max(1, Math.round(scrollWidth / width))
}
