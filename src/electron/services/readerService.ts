import AdmZip from 'adm-zip'
import { XMLParser } from 'fast-xml-parser'
import { SpineItem } from '../../types/models/spineItem'
import { ManifestItem } from '../../types/models/manifestItem'
import { TocSource } from '../../types/models/tocSource'

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
	mediaTypes: Map<string, string>   // zip path -> media-type the manifest declares for it
	tocSource: TocSource | null       // nav document (EPUB 3) or NCX (EPUB 2), if the book has one
}

// One entry per book path, built on first use and kept for the rest of the session.
// Nothing ever removes or refreshes an entry, so a changed/moved file keeps its old data.
const bookCache = new Map<string, BookCache>()

// Decodes '%20' style escapes in an href; malformed escapes are kept as written.
function decodeHref(href: string): string {
	try {
		return decodeURI(href)
	} catch {
		return href
	}
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
	const manifestItems: { '@_id': string; '@_href': string; '@_media-type': string; '@_properties'?: string }[] =
		opf?.package?.manifest?.item ?? []
	const manifest: ManifestItem[] = manifestItems.map((item) => ({
		id: item['@_id'],
		href: item['@_href'],
		mediaType: item['@_media-type'],
		properties: (item['@_properties'] ?? '').split(/\s+/).filter(Boolean),
	}))

	// Spine: each <itemref idref> points at a manifest id. Look it up and turn the
	// href into a full, decoded zip path (opfDir + href) so callers can read it directly.
	// size is the uncompressed byte length, used to weight chapters for total progress.
	// Itemrefs with no matching manifest item are dropped. linear="no" is not checked.
	const spineRefs: { '@_idref': string }[] = opf?.package?.spine?.itemref ?? []
	const spine: SpineItem[] = spineRefs
		.map((ref) => {
			const manifestItem = manifest.find((m) => m.id === ref['@_idref'])
			if (!manifestItem) return null

			const href = opfDir + decodeHref(manifestItem.href)

			return { id: ref['@_idref'], href, size: zip.getEntry(href)?.header.size ?? 0 }
		})
		.filter((item): item is SpineItem => item !== null)

	// Manifest hrefs are URLs ('my%20pic.png'), zip entry names are not ('my pic.png')
	const mediaTypes = new Map(manifest.map((item) => [opfDir + decodeHref(item.href), item.mediaType]))

	// TOC: EPUB 3 marks its nav document with properties="nav". EPUB 2 points at the NCX from
	// <spine toc="ncx-id">; some books only declare the NCX by media-type. EPUB 3 books often ship
	// both, and the nav document wins.
	const navItem = manifest.find((item) => item.properties.includes('nav'))
	const ncxId: string | undefined = opf?.package?.spine?.['@_toc']
	const ncxItem = manifest.find((item) => item.id === ncxId)
		?? manifest.find((item) => item.mediaType === 'application/x-dtbncx+xml')
	const tocSource: TocSource | null = navItem
		? { href: opfDir + decodeHref(navItem.href), type: 'nav' }
		: ncxItem ? { href: opfDir + decodeHref(ncxItem.href), type: 'ncx' } : null

	const cache: BookCache = { zip, spine, manifest, opfDir, mediaTypes, tocSource }
	bookCache.set(bookPath, cache)
	return cache
}

// IPC 'reader:getSpine'. Returns the book's chapters in reading order ([] if the book can't be parsed).
// The renderer loads chapters over book:// using spine[i].href.
export async function getSpine(bookPath: string): Promise<SpineItem[]> {
	const cache = getOrBuildCache(bookPath)
	if (!cache)
		return []

	return cache.spine
}

// Used by the book:// protocol. Returns the raw bytes of one zip entry plus the media-type the
// manifest declares for it (null if the file isn't in the manifest, e.g. META-INF files).
// Returns null if the book can't be parsed or the entry doesn't exist.
export function readBookEntry(bookPath: string, entryPath: string): { data: Buffer; mediaType: string | null } | null {
	const cache = getOrBuildCache(bookPath)
	if (!cache)
		return null

	const data = cache.zip.readFile(entryPath)
	if (!data)
		return null

	return { data, mediaType: cache.mediaTypes.get(entryPath) ?? null }
}

// IPC 'reader:getTocSource'. The renderer fetches and parses the file itself over book://.
export async function getTocSource(bookPath: string): Promise<TocSource | null> {
	return getOrBuildCache(bookPath)?.tocSource ?? null
}
