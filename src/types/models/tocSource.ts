// Where a book's table of contents lives: the EPUB 3 navigation document or the EPUB 2 NCX file.
export interface TocSource {
	href: string // decoded zip path
	type: 'nav' | 'ncx'
}
