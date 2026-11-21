import AdmZip from 'adm-zip'
import { XMLParser } from 'fast-xml-parser'
import path from 'path'
import { SpineItem } from '../../types/models/spineItem'
import { ManifestItem } from '../../types/models/manifestItem'
import { ChapterBundle } from '../../types/models/chapterBundle'

// Shared parser for container.xml and the OPF.
// Attributes are kept and prefixed with '@_' (e.g. item['@_href']).
// item/itemref/rootfile are always arrays, even when the file only has one of them,
// so the code below never has to check "is this an object or an array?".
const xmlParser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	isArray: (name) => name === 'item' || name === 'itemref' || name === 'rootfile',
})

// Everything we keep in memory for an opened book.
interface BookCache {
	zip: AdmZip                       // the whole .epub loaded into memory
	spine: SpineItem[]                // reading order, hrefs are full paths inside the zip
	manifest: ManifestItem[]          // every file the OPF declares, hrefs relative to the OPF
	opfDir: string                    // folder the OPF lives in, e.g. 'OEBPS/' (or '' at zip root)
	processedCss: Map<string, string> // zip path -> CSS already processed by getProcessedCss
}

// One entry per book path, built on first use and kept for the rest of the session.
// Nothing ever removes or refreshes an entry, so a changed/moved file keeps its old data.
const bookCache = new Map<string, BookCache>()

// File extension -> MIME type, used when turning fonts and images into data URIs.
const mimeMap: Record<string, string> = {
	ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2',
	jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
	gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
}

// Resolves a relative href against the file it appears in, giving a full path inside the zip.
// e.g. base 'OEBPS/Text/ch1.xhtml' + '../Images/a.png' -> 'OEBPS/Images/a.png'
// Takes the base file's folder, joins the href, then walks the segments:
// '..' drops the previous segment, '.' is skipped.
// Note: does not strip '#fragment'/'?query' or decode '%20' style escapes.
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

// Opens a book and parses its structure, or returns the cached result if already opened.
// EPUB lookup chain:
//   META-INF/container.xml -> points at the OPF file
//   OPF <manifest>         -> list of every file in the book (id -> href)
//   OPF <spine>            -> reading order, as a list of manifest ids
// Returns null if any step is missing. Failures are not cached, so the next call retries.
// new AdmZip throws if the file can't be read; that error is not caught here.
function getOrBuildCache(bookPath: string): BookCache | null {
	if (bookCache.has(bookPath))
		return bookCache.get(bookPath)!

	const zip = new AdmZip(bookPath)

	// container.xml is the fixed entry point of every EPUB
	const containerText = zip.readAsText('META-INF/container.xml')
	if (!containerText) return null

	// Only the first <rootfile> is used; extra renditions are ignored
	const containerXml = xmlParser.parse(containerText)
	const rootFiles: { '@_full-path': string }[] = containerXml?.container?.rootfiles?.rootfile ?? []
	const opfPath: string | null = rootFiles[0]?.['@_full-path'] ?? null
	if (!opfPath) return null

	const opfText = zip.readAsText(opfPath)
	if (!opfText) return null

	// Manifest/spine hrefs are relative to the OPF, so remember its folder
	const opf = xmlParser.parse(opfText)
	const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : ''

	// Manifest: flatten the parsed <item> elements into { id, href, mediaType }
	const manifestItems: { '@_id': string; '@_href': string; '@_media-type': string }[] =
		opf?.package?.manifest?.item ?? []
	const manifest: ManifestItem[] = manifestItems.map((item) => ({
		id: item['@_id'],
		href: item['@_href'],
		mediaType: item['@_media-type'],
	}))

	// Spine: each <itemref idref> points at a manifest id. Look it up and turn the
	// href into a full zip path (opfDir + href) so callers can read it directly.
	// Itemrefs with no matching manifest item are dropped. linear="no" is not checked.
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

// Reads one stylesheet from the zip and makes it usable outside the EPUB.
// Result is cached per CSS path, so a stylesheet shared by every chapter is processed once.
// 1. Removes page-break-* / break-* declarations so the book's CSS can't break our pagination.
// 2. Replaces every url(...) that points to a known font/image with a base64 data URI,
//    because the renderer has no way to fetch files from inside the zip.
//    Unknown extensions or missing files keep the original url(...).
// Missing CSS files are cached as '' so we don't look them up again.
function getProcessedCss(zip: AdmZip, cache: BookCache, cssZipPath: string): string {
	if (cache.processedCss.has(cssZipPath))
		return cache.processedCss.get(cssZipPath)!

	const rawCss = zip.readAsText(cssZipPath)
	if (!rawCss) {
		cache.processedCss.set(cssZipPath, '')
		return ''
	}

	const processed = rawCss
		// Strip "page-break-before: always;", "break-after: page" etc.
		.replace(/\b(?:page-break-(?:before|after)|break-(?:before|after))\s*:[^;}\n]+;?/gi, '')
		// Inline url(...) references; paths are relative to the CSS file, not the chapter
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

// IPC 'reader:getSpine'. Returns the book's chapters in reading order ([] if the book can't be parsed).
// The renderer uses spine[i].href as the chapterHref for getChapterBundle.
export async function getSpine(bookPath: string): Promise<SpineItem[]> {
	const cache = getOrBuildCache(bookPath)
	if (!cache)
		return []

	return cache.spine
}

// IPC 'reader:getChapterBundle'. Turns one chapter file (XHTML) into { html, styles }
// that the renderer can inject without any access to the zip.
//   html   - inner content of <body>, with all images embedded as data URIs
//   styles - one processed CSS string per <link rel="stylesheet">, in document order
// chapterHref must be a full zip path (a spine href). Returns empty values if anything is missing.
// Note: everything in <head> other than linked CSS (e.g. inline <style>) and the attributes
// on <html>/<body> are not kept. All work here is synchronous on the main process.
export async function getChapterBundle(bookPath: string, chapterHref: string): Promise<ChapterBundle> {
	const cache = getOrBuildCache(bookPath)
	if (!cache)
		return { html: '', styles: [] }

	const zip = cache.zip

	const chapterText = zip.readAsText(chapterHref)
	if (!chapterText)
		return { html: '', styles: [] }

	// 1. Keep only what's between <body ...> and </body>. Falls back to the whole file if there's no <body>.
	const bodyMatch = chapterText.match(/<body[^>]*>([\s\S]*)<\/body>/i)
	const rawBody = bodyMatch?.[1] ?? chapterText

	// 2. Strip XML namespace prefixes from tag names (<svg:svg> -> <svg>, </epub:switch> -> </switch>).
	//    The renderer parses this as HTML, which doesn't understand prefixed tags.
	//    Prefixed attributes like epub:type or xlink:href are left alone.
	const bodyContent = rawBody
		.replace(/<([a-zA-Z]+):([a-zA-Z])/g, '<$2')
		.replace(/<\/([a-zA-Z]+):[a-zA-Z][^>]*>/g, (m) => m.replace(/^<\/[a-zA-Z]+:/, '</'))

	// 3. Find every <link rel="stylesheet" href="..."> in the original file (they live in <head>)
	//    and collect their hrefs.
	const linkPattern = /<link[^>]*rel=['"]stylesheet['"][^>]*>/gi
	const hrefPattern = /href=['"]([^'"]+)['"]/i
	const linkTags = chapterText.match(linkPattern) ?? []
	const cssHrefs = linkTags
		.map((tag) => hrefPattern.exec(tag)?.[1])
		.filter((href): href is string => !!href)

	// 4. Resolve each CSS href against the chapter's path and process it (cached per book).
	const styles = cssHrefs.map((cssHref) => {
		const cssZipPath = resolveZipPath(chapterHref, cssHref)

		return getProcessedCss(zip, cache, cssZipPath)
	})

	// Reads an image (path relative to the chapter) and returns the tag rebuilt with a data URI.
	// `wrap` rebuilds the tag around the URI; `fallback` (the original tag) is returned if the image is missing.
	// Unknown extensions are assumed to be JPEG.
	const embedImage = (imgHref: string, fallback: string, wrap: (dataUri: string) => string): string => {
		const imgZipPath = resolveZipPath(chapterHref, imgHref)
		const ext = path.extname(imgZipPath).toLowerCase().slice(1)
		const mime = mimeMap[ext] ?? 'image/jpeg'
		const buffer = zip.readFile(imgZipPath)
		if (!buffer)
			return fallback

		return wrap(`data:${mime};base64,${buffer.toString('base64')}`)
	}

	// 5. Embed HTML images: <img ... src="x.jpg" ...> -> <img ... src="data:..." ...>
	//    `before`/`after` keep every other attribute on the tag unchanged.
	const withImgs = bodyContent.replace(/<img([^>]*)src=['"]([^'"]+)['"]([^>]*)>/gi, (_match, before, imgHref, after) =>
		embedImage(imgHref, _match, (uri) => `<img${before}src="${uri}"${after}>`)
	)

	// 6. Embed SVG images: <image ... xlink:href="x.jpg"> (or <svg:image ...>).
	//    Common for covers and full-page illustrations. Plain href="..." without xlink: is not handled.
	const html = withImgs.replace(/<((?:\w+:)?image)([^>]*)xlink:href=['"]([^'"]+)['"]([^>]*)>/gi, (_match, tag, before, imgHref, after) =>
		embedImage(imgHref, _match, (uri) => `<${tag}${before}xlink:href="${uri}"${after}>`)
	)

	return { html, styles }
}
