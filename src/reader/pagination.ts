// CSS for the chapter iframe. Defaults go first in <head> so the book's own CSS overrides them;
// the layout goes last and uses !important because pagination breaks if a book changes it.

export interface PageLayout {
	width: number   // iframe width in px; one page per width
	height: number  // iframe height in px
	marginX: number // left/right padding of each page
	marginY: number // top/bottom padding of each page
}

// Until themes exist (step 5): readable on the app's dark background.
export const READER_DEFAULTS_CSS = `
html {
	color-scheme: dark;
	color: #e8e8e8;
	background: transparent;
	font-size: 1rem;
	line-height: 1.6;
}
body {
	margin: 0;
}
a {
	color: #c87941;
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

export function countPages(scrollWidth: number, width: number): number {
	if (width <= 0)
		return 1

	return Math.max(1, Math.round(scrollWidth / width))
}
