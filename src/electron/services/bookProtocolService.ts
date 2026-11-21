import path from 'path'
import { parseBookUrl } from '../../shared/bookUrl'
import { getBook } from './bookService'
import { readBookEntry } from './readerService'

// Applies to documents opened straight from book://. Book content never gets to run scripts,
// and can only load resources from its own book (its own book-<id> origin) or data: URIs.
const CONTENT_SECURITY_POLICY = [
	"default-src 'self' data:",
	"style-src 'self' 'unsafe-inline' data:",
	"script-src 'none'",
	"object-src 'none'",
	"base-uri 'self'",
].join('; ')

// Used when the manifest doesn't declare a media-type for the entry.
const CONTENT_TYPES: Record<string, string> = {
	xhtml: 'application/xhtml+xml', html: 'text/html', htm: 'text/html',
	css: 'text/css', xml: 'application/xml', opf: 'application/oebps-package+xml',
	ncx: 'application/x-dtbncx+xml', svg: 'image/svg+xml',
	jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
	ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2',
	mp3: 'audio/mpeg', mp4: 'video/mp4', m4a: 'audio/mp4',
}

function getContentType(entryPath: string, declared: string | null): string {
	if (declared)
		return declared

	const ext = path.extname(entryPath).toLowerCase().slice(1)

	return CONTENT_TYPES[ext] ?? 'application/octet-stream'
}

function errorResponse(status: number, message: string): Response {
	return new Response(message, { status, headers: { 'Content-Type': 'text/plain' } })
}

// protocol.handle('book', ...) handler. Only books in the library can be read, by id,
// so a URL can never point at an arbitrary file on disk.
export async function handleBookRequest(request: Pick<Request, 'url'>): Promise<Response> {
	const target = parseBookUrl(request.url)
	if (!target)
		return errorResponse(400, 'Invalid book URL')

	const book = await getBook(target.bookId)
	if (!book)
		return errorResponse(404, 'Book not found')

	let entry: ReturnType<typeof readBookEntry>
	try {
		entry = readBookEntry(book.path, target.entryPath)
	} catch {
		return errorResponse(500, 'Book could not be read')
	}

	if (!entry)
		return errorResponse(404, 'Entry not found')

	return new Response(new Uint8Array(entry.data), {
		status: 200,
		headers: {
			'Content-Type': getContentType(target.entryPath, entry.mediaType),
			'Content-Security-Policy': CONTENT_SECURITY_POLICY,
			// The reader fetches chapters from the app's origin, and web fonts are always loaded with CORS
			'Access-Control-Allow-Origin': '*',
			'X-Content-Type-Options': 'nosniff',
		},
	})
}
