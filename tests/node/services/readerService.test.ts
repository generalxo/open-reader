import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import AdmZip from 'adm-zip'
import { getSpine } from '../../../src/electron/services/readerService'

const CONTAINER = `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
	<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`

const OPF = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
	<manifest>
		<item id="ch1" href="Text/chapter%201.xhtml" media-type="application/xhtml+xml"/>
		<item id="ch2" href="Text/ch2.xhtml" media-type="application/xhtml+xml"/>
	</manifest>
	<spine><itemref idref="ch1"/><itemref idref="missing"/><itemref idref="ch2"/></spine>
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
