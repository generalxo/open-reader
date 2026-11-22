import path from 'path';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

// The parser returns a single object for one element and an array for several
function toArray<T>(value: T | T[] | undefined | null): T[] {
	if (value === undefined || value === null)
		return []

	return Array.isArray(value) ? value : [value]
}

const xmlParser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	isArray: (name) => name === 'rootfile',
})

export async function getBookCoverPath(bookpath: string): Promise<string | null> {
	const zipFile = new AdmZip(bookpath)
	if (!zipFile)
		return null

	const containerEntry = zipFile.readAsText('META-INF/container.xml')
	if (!containerEntry)
		return null

	const containerXml = xmlParser.parse(containerEntry)
	const rootFilesArr: { '@_full-path': string }[] = containerXml?.container?.rootfiles?.rootfile ?? []
	const rootFileName = rootFilesArr[0]?.['@_full-path'] ?? null
	if (!rootFileName)
		return null

	const rootFileData = zipFile.readAsText(rootFileName)
	if (!rootFileData)
		return null

	const opf = xmlParser.parse(rootFileData)
	const version: string = opf?.package?.['@_version'] ?? null
	if (!version)
		return null

	const opfDir = rootFileName.includes('/') ? rootFileName.substring(0, rootFileName.lastIndexOf('/') + 1) : ''
	const manifestItems = toArray<{ '@_id': string; '@_href': string; '@_properties'?: string }>(opf?.package?.manifest?.item)

	let coverHref: string | null = null

	if (version.startsWith('3')) {
		const coverItem = manifestItems.find((item) => (item?.['@_properties'] ?? '').split(/\s+/).includes('cover-image'))
		coverHref = coverItem?.['@_href'] ?? null
	}

	if (!coverHref) {
		const metas = toArray<{ '@_name': string; '@_content': string }>(opf?.package?.metadata?.meta)
		const coverMeta = metas.find((meta) => meta?.['@_name'] === 'cover')
		const coverId = coverMeta?.['@_content'] ?? null

		if (coverId) {
			const coverItem = manifestItems.find((item) => item?.['@_id'] === coverId)
			coverHref = coverItem?.['@_href'] ?? null
		}
	}

	if (!coverHref)
		return null

	return opfDir + coverHref
}

export async function getBookCoverImage(bookPath: string, coverPath: string): Promise<string | null> {
	const zipFile = new AdmZip(bookPath)
	const buffer = zipFile.readFile(coverPath)
	if (!buffer)
		return null

	const ext = path.extname(coverPath).toLowerCase().slice(1)
	const mimeMap: Record<string, string> = {
		jpg: 'image/jpeg', jpeg: 'image/jpeg',
		png: 'image/png', gif: 'image/gif',
		webp: 'image/webp', svg: 'image/svg+xml',
	}
	const mime = mimeMap[ext] ?? 'image/jpeg'

	return `data:${mime};base64,${buffer.toString('base64')}`
}
