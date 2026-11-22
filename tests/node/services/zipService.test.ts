import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import AdmZip from 'adm-zip'
import { getBookCoverPath } from '../../../src/electron/services/zipService'

const CONTAINER = `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
	<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`

let tmpDir: string

function writeBook(name: string, opf: string): string {
	const file = path.join(tmpDir, name)
	const zip = new AdmZip()
	zip.addFile('META-INF/container.xml', Buffer.from(CONTAINER))
	zip.addFile('OEBPS/content.opf', Buffer.from(opf))
	zip.writeZip(file)

	return file
}

beforeAll(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-reader-'))
})

afterAll(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('getBookCoverPath', () => {
	it('finds the EPUB 3 cover-image item, also when it has more properties', async () => {
		const book = writeBook('epub3.epub', `<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
			<manifest>
				<item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
				<item id="cover" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image svg"/>
			</manifest>
		</package>`)

		expect(await getBookCoverPath(book)).toBe('OEBPS/images/cover.jpg')
	})

	it('falls back to the EPUB 2 <meta name="cover">, with a single manifest item and meta', async () => {
		const book = writeBook('epub2.epub', `<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
			<metadata><meta name="cover" content="cover-img"/></metadata>
			<manifest><item id="cover-img" href="cover.png" media-type="image/png"/></manifest>
		</package>`)

		expect(await getBookCoverPath(book)).toBe('OEBPS/cover.png')
	})

	it('returns null when the book declares no cover', async () => {
		const book = writeBook('none.epub', `<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
			<manifest><item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/></manifest>
		</package>`)

		expect(await getBookCoverPath(book)).toBeNull()
	})
})
