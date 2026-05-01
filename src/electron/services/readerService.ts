import AdmZip from 'adm-zip'
import { XMLParser } from 'fast-xml-parser'
import path from 'path'
import { SpineItem } from '../../types/models/spineItem'
import { ManifestItem } from '../../types/models/manifestItem'
import { ChapterBundle } from '../../types/models/chapterBundle'

const xmlParser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	isArray: (name) => name === 'item' || name === 'itemref' || name === 'rootfile',
})

interface BookCache {
	zip: AdmZip
	spine: SpineItem[]
	manifest: ManifestItem[]
	opfDir: string
	processedCss: Map<string, string>
}

const bookCache = new Map<string, BookCache>()

const mimeMap: Record<string, string> = {
	ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2',
	jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
	gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
}

function resolveZipPath(base: string, relative: string): string {
	const baseDir = base.includes('/') ? base.substring(0, base.lastIndexOf('/') + 1) : ''
	const parts = (baseDir + relative).split('/')
	const resolved: string[] = []
	for (const part of parts) {
		if (part === '..') resolved.pop()
		else if (part !== '.') resolved.push(part)
	}
	return resolved.join('/')
}

function getOrBuildCache(bookPath: string): BookCache | null {
	if (bookCache.has(bookPath))
		return bookCache.get(bookPath)!

	const zip = new AdmZip(bookPath)

	const containerText = zip.readAsText('META-INF/container.xml')
	if (!containerText) return null

	const containerXml = xmlParser.parse(containerText)
	const rootFiles: { '@_full-path': string }[] = containerXml?.container?.rootfiles?.rootfile ?? []
	const opfPath: string | null = rootFiles[0]?.['@_full-path'] ?? null
	if (!opfPath) return null

	const opfText = zip.readAsText(opfPath)
	if (!opfText) return null

	const opf = xmlParser.parse(opfText)
	const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : ''

	const manifestItems: { '@_id': string; '@_href': string; '@_media-type': string }[] =
		opf?.package?.manifest?.item ?? []
	const manifest: ManifestItem[] = manifestItems.map((item) => ({
		id: item['@_id'],
		href: item['@_href'],
		mediaType: item['@_media-type'],
	}))

	const spineRefs: { '@_idref': string }[] = opf?.package?.spine?.itemref ?? []
	const spine: SpineItem[] = spineRefs
		.map((ref) => {
			const manifestItem = manifest.find((m) => m.id === ref['@_idref'])
			if (!manifestItem) return null
			return { id: ref['@_idref'], href: opfDir + manifestItem.href }
		})
		.filter((item): item is SpineItem => item !== null)

	const cache: BookCache = { zip, spine, manifest, opfDir, processedCss: new Map() }
	bookCache.set(bookPath, cache)
	return cache
}

function getProcessedCss(zip: AdmZip, cache: BookCache, cssZipPath: string): string {
	if (cache.processedCss.has(cssZipPath))
		return cache.processedCss.get(cssZipPath)!

	const rawCss = zip.readAsText(cssZipPath)
	if (!rawCss) {
		cache.processedCss.set(cssZipPath, '')
		return ''
	}

	const processed = rawCss
		.replace(/\b(?:page-break-(?:before|after)|break-(?:before|after))\s*:[^;}\n]+;?/gi, '')
		.replace(/url\(['"]?([^'")\s]+)['"]?\)/gi, (_match, href) => {
		const zipPath = resolveZipPath(cssZipPath, href)
		const ext = path.extname(zipPath).toLowerCase().slice(1)

		const mime = mimeMap[ext]
		if (!mime)
			return _match

		const buffer = zip.readFile(zipPath)
		if (!buffer)
			return _match

		return `url('data:${mime};base64,${buffer.toString('base64')}')`
	})

	cache.processedCss.set(cssZipPath, processed)
	return processed
}

export async function getSpine(bookPath: string): Promise<SpineItem[]> {
	const cache = getOrBuildCache(bookPath)
	if (!cache)
		return []

	return cache.spine
}

export async function getChapterBundle(bookPath: string, chapterHref: string): Promise<ChapterBundle> {
	const cache = getOrBuildCache(bookPath)
	if (!cache)
		return { html: '', styles: [] }

	const zip = cache.zip

	const chapterText = zip.readAsText(chapterHref)
	if (!chapterText)
		return { html: '', styles: [] }

	const bodyMatch = chapterText.match(/<body[^>]*>([\s\S]*)<\/body>/i)
	const rawBody = bodyMatch?.[1] ?? chapterText
	const bodyContent = rawBody
		.replace(/<([a-zA-Z]+):([a-zA-Z])/g, '<$2')
		.replace(/<\/([a-zA-Z]+):[a-zA-Z][^>]*>/g, (m) => m.replace(/^<\/[a-zA-Z]+:/, '</'))

	const linkPattern = /<link[^>]*rel=['"]stylesheet['"][^>]*>/gi
	const hrefPattern = /href=['"]([^'"]+)['"]/i
	const linkTags = chapterText.match(linkPattern) ?? []
	const cssHrefs = linkTags
		.map((tag) => hrefPattern.exec(tag)?.[1])
		.filter((href): href is string => !!href)

	const styles = cssHrefs.map((cssHref) => {
		const cssZipPath = resolveZipPath(chapterHref, cssHref)

		return getProcessedCss(zip, cache, cssZipPath)
	})

	const embedImage = (imgHref: string, fallback: string, wrap: (dataUri: string) => string): string => {
		const imgZipPath = resolveZipPath(chapterHref, imgHref)
		const ext = path.extname(imgZipPath).toLowerCase().slice(1)
		const mime = mimeMap[ext] ?? 'image/jpeg'
		const buffer = zip.readFile(imgZipPath)
		if (!buffer)
			return fallback

		return wrap(`data:${mime};base64,${buffer.toString('base64')}`)
	}

	const withImgs = bodyContent.replace(/<img([^>]*)src=['"]([^'"]+)['"]([^>]*)>/gi, (_match, before, imgHref, after) =>
		embedImage(imgHref, _match, (uri) => `<img${before}src="${uri}"${after}>`)
	)

	const html = withImgs.replace(/<((?:\w+:)?image)([^>]*)xlink:href=['"]([^'"]+)['"]([^>]*)>/gi, (_match, tag, before, imgHref, after) =>
		embedImage(imgHref, _match, (uri) => `<${tag}${before}xlink:href="${uri}"${after}>`)
	)

	return { html, styles }
}
