import { vi, beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import AdmZip from 'adm-zip'

vi.mock('../../../src/electron/services/bookService.ts', () => ({
	getBook: vi.fn(),
}))

import { getBook } from '../../../src/electron/services/bookService'
import { handleBookRequest } from '../../../src/electron/services/bookProtocolService'

const mockGetBook = vi.mocked(getBook)

const CONTAINER = `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
	<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`

const OPF = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
	<manifest>
		<item id="ch1" href="Text/ch1.xhtml" media-type="application/xhtml+xml"/>
		<item id="pic" href="Images/my%20pic.png" media-type="image/png"/>
	</manifest>
	<spine><itemref idref="ch1"/></spine>
</package>`

const CHAPTER = '<html xmlns="http://www.w3.org/1999/xhtml"><body><p>Hello</p></body></html>'

let tmpDir: string
let bookPath: string

function bookRow(id: number, filePath: string) {
	return { id, path: filePath, filename: path.basename(filePath), coverImagePath: null, dateAdded: 0 }
}

beforeAll(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-reader-'))
	bookPath = path.join(tmpDir, 'test.epub')

	const zip = new AdmZip()
	zip.addFile('META-INF/container.xml', Buffer.from(CONTAINER))
	zip.addFile('OEBPS/content.opf', Buffer.from(OPF))
	zip.addFile('OEBPS/Text/ch1.xhtml', Buffer.from(CHAPTER))
	zip.addFile('OEBPS/Images/my pic.png', Buffer.from([0x89, 0x50, 0x4e, 0x47]))
	zip.addFile('OEBPS/Styles/extra.css', Buffer.from('p { color: red }'))
	zip.writeZip(bookPath)
})

afterAll(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('handleBookRequest', () => {
	beforeEach(() => {
		mockGetBook.mockReset()
		mockGetBook.mockResolvedValue(bookRow(1, bookPath))
	})

	it('serves an entry with the media-type from the manifest', async () => {
		const response = await handleBookRequest({ url: 'book://book-1/OEBPS/Text/ch1.xhtml' })

		expect(response.status).toBe(200)
		expect(response.headers.get('Content-Type')).toBe('application/xhtml+xml')
		expect(await response.text()).toBe(CHAPTER)
		expect(mockGetBook).toHaveBeenCalledWith(1)
	})

	it('matches percent-encoded manifest hrefs against decoded entry names', async () => {
		const response = await handleBookRequest({ url: 'book://book-1/OEBPS/Images/my%20pic.png' })

		expect(response.status).toBe(200)
		expect(response.headers.get('Content-Type')).toBe('image/png')
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))
	})

	it('falls back to the file extension for entries missing from the manifest', async () => {
		const response = await handleBookRequest({ url: 'book://book-1/OEBPS/Styles/extra.css' })

		expect(response.headers.get('Content-Type')).toBe('text/css')
	})

	it('sends a no-script CSP and CORS headers', async () => {
		const response = await handleBookRequest({ url: 'book://book-1/OEBPS/Text/ch1.xhtml' })

		expect(response.headers.get('Content-Security-Policy')).toContain("script-src 'none'")
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
	})

	it('returns 400 for invalid urls', async () => {
		const response = await handleBookRequest({ url: 'book://book-1/OEBPS%2F..%2Fsecret' })

		expect(response.status).toBe(400)
		expect(mockGetBook).not.toHaveBeenCalled()
	})

	it('returns 404 for unknown books and entries', async () => {
		mockGetBook.mockResolvedValueOnce(null)

		expect((await handleBookRequest({ url: 'book://book-99/OEBPS/Text/ch1.xhtml' })).status).toBe(404)
		expect((await handleBookRequest({ url: 'book://book-1/OEBPS/Text/missing.xhtml' })).status).toBe(404)
	})

	it('returns 500 when the book file cannot be read', async () => {
		mockGetBook.mockResolvedValueOnce(bookRow(2, path.join(tmpDir, 'gone.epub')))

		expect((await handleBookRequest({ url: 'book://book-2/OEBPS/Text/ch1.xhtml' })).status).toBe(500)
	})
})
