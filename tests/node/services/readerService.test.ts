import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import AdmZip from 'adm-zip'
import { getSpine, getTocSource } from '../../../src/electron/services/readerService'

const CONTAINER = `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
	<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`

const OPF = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
	<manifest>
		<item id="ch1" href="Text/chapter%201.xhtml" media-type="application/xhtml+xml"/>
		<item id="ch2" href="Text/ch2.xhtml" media-type="application/xhtml+xml"/>
		<item id="nav" href="Nav/nav%20doc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
		<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
	</manifest>
	<spine toc="ncx"><itemref idref="ch1"/><itemref idref="missing"/><itemref idref="ch2"/></spine>
</package>`

let tmpDir: string
let bookPath: string

beforeAll(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-reader-'))
	bookPath = path.join(tmpDir, 'spine.epub')

	const zip = new AdmZip()
	zip.addFile('META-INF/container.xml', Buffer.from(CONTAINER))
	zip.addFile('OEBPS/content.opf', Buffer.from(OPF))
	zip.addFile('OEBPS/Text/chapter 1.xhtml', Buffer.from('x'.repeat(120)))
	zip.addFile('OEBPS/Text/ch2.xhtml', Buffer.from('y'.repeat(40)))
	zip.writeZip(bookPath)
})

afterAll(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('getSpine', () => {
	it('returns decoded zip paths with uncompressed sizes, dropping unknown idrefs', async () => {
		expect(await getSpine(bookPath)).toEqual([
			{ id: 'ch1', href: 'OEBPS/Text/chapter 1.xhtml', size: 120 },
			{ id: 'ch2', href: 'OEBPS/Text/ch2.xhtml', size: 40 },
		])
	})
})

function writeBook(name: string, manifest: string, spineAttrs = ''): string {
	const file = path.join(tmpDir, name)
	const zip = new AdmZip()
	zip.addFile('META-INF/container.xml', Buffer.from(CONTAINER))
	zip.addFile('OEBPS/content.opf', Buffer.from(`<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
		<manifest>${manifest}</manifest><spine ${spineAttrs}><itemref idref="ch1"/></spine></package>`))
	zip.writeZip(file)

	return file
}

describe('getTocSource', () => {
	it('prefers the EPUB 3 nav document over the NCX', async () => {
		expect(await getTocSource(bookPath)).toEqual({ href: 'OEBPS/Nav/nav doc.xhtml', type: 'nav' })
	})

	it('falls back to the NCX from spine toc, or by media-type', async () => {
		const ch1 = '<item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>'
		const bySpine = writeBook('ncx-spine.epub', `${ch1}<item id="t" href="nav/toc.ncx" media-type="text/xml"/>`, 'toc="t"')
		const byType = writeBook('ncx-type.epub', `${ch1}<item id="x" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`)

		expect(await getTocSource(bySpine)).toEqual({ href: 'OEBPS/nav/toc.ncx', type: 'ncx' })
		expect(await getTocSource(byType)).toEqual({ href: 'OEBPS/toc.ncx', type: 'ncx' })
	})

	it('returns null for books without a TOC', async () => {
		const none = writeBook('no-toc.epub', '<item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>')

		expect(await getTocSource(none)).toBeNull()
	})
})
