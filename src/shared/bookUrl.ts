// URLs for files inside a library book, served by the main process's book:// protocol.
// Shape: book://book-<id>/<zip entry path, each segment percent-encoded>
// e.g.   book://book-3/OEBPS/Images/my%20pic.png -> book 3, entry 'OEBPS/Images/my pic.png'
// The host carries the book id with a prefix because a bare number ('3') can be
// canonicalised as an IPv4 address for standard schemes.
// Shared by main (parsing requests) and renderer (building URLs), so no Node/DOM APIs here.

export const BOOK_SCHEME = 'book'

export interface BookUrl {
	bookId: number
	entryPath: string
}

const HOST_PATTERN = /^book-(\d+)$/

export function buildBookUrl(bookId: number, entryPath: string): string {
	const encodedPath = entryPath.split('/').map(encodeURIComponent).join('/')

	return `${BOOK_SCHEME}://book-${bookId}/${encodedPath}`
}

// Returns null for anything that isn't a well-formed book URL. Query and fragment are ignored.
// Rejects empty, '.' and '..' segments and segments that decode to a slash, so a URL maps to
// exactly one entry path and can't be used to climb out of the book.
export function parseBookUrl(url: string): BookUrl | null {
	let parsed: URL
	try {
		parsed = new URL(url)
	} catch {
		return null
	}

	if (parsed.protocol !== `${BOOK_SCHEME}:`)
		return null

	const hostMatch = HOST_PATTERN.exec(parsed.hostname)
	if (!hostMatch)
		return null

	let segments: string[]
	try {
		segments = parsed.pathname.split('/').slice(1).map(decodeURIComponent)
	} catch {
		return null
	}

	const isInvalid = (segment: string) =>
		segment === '' || segment === '.' || segment === '..' || segment.includes('/') || segment.includes('\\')
	if (segments.length === 0 || segments.some(isInvalid))
		return null

	return { bookId: Number(hostMatch[1]), entryPath: segments.join('/') }
}
