import { resolveBookHref } from '../shared/bookUrl'

const EPUB_NAMESPACE = 'http://www.idpf.org/2007/ops'

export interface TocEntry {
	label: string
	href: string | null     // zip path of the target file; null for headings that link nowhere
	fragment: string | null // element id inside that file
	children: TocEntry[]
}

function parseXml(source: string): Document {
	const parser = new DOMParser()
	const doc = parser.parseFromString(source, 'application/xhtml+xml')
	if (doc.getElementsByTagName('parsererror').length === 0)
		return doc

	return parser.parseFromString(source, 'text/html')
}

function childElements(parent: Element, localName: string): Element[] {
	return Array.from(parent.children).filter((child) => child.localName === localName)
}

function cleanLabel(text: string | null | undefined): string {
	return (text ?? '').replace(/\s+/g, ' ').trim()
}

function entry(label: string, rawHref: string | null, basePath: string, children: TocEntry[]): TocEntry {
	const target = rawHref ? resolveBookHref(basePath, rawHref) : null

	return { label, href: target?.entryPath ?? null, fragment: target?.fragment ?? null, children }
}

function epubType(element: Element): string[] {
	const value = element.getAttributeNS(EPUB_NAMESPACE, 'type') ?? element.getAttribute('epub:type') ?? ''

	return value.split(/\s+/)
}

function parseNavList(list: Element, basePath: string): TocEntry[] {
	return childElements(list, 'li').map((item) => {
		const link = childElements(item, 'a')[0] ?? childElements(item, 'span')[0]
		const nested = childElements(item, 'ol')[0]
		const children = nested ? parseNavList(nested, basePath) : []

		return entry(cleanLabel(link?.textContent), link?.getAttribute('href') ?? null, basePath, children)
	})
}

// EPUB 3: <nav epub:type="toc"><ol><li><a href="...">Label</a><ol>...</ol></li></ol></nav>
// Other <nav>s (landmarks, page-list) are ignored unless no nav is marked as the toc.
export function parseNavToc(source: string, navPath: string): TocEntry[] {
	const doc = parseXml(source)
	const navs = Array.from(doc.getElementsByTagName('nav'))
	const toc = navs.find((nav) => epubType(nav).includes('toc')) ?? navs[0]
	const list = toc ? childElements(toc, 'ol')[0] : undefined

	return list ? parseNavList(list, navPath) : []
}

function parseNavPoints(parent: Element, basePath: string): TocEntry[] {
	return childElements(parent, 'navPoint').map((point) => {
		const label = childElements(point, 'navLabel')[0]
		const text = label ? childElements(label, 'text')[0] : undefined
		const content = childElements(point, 'content')[0]

		return entry(cleanLabel(text?.textContent), content?.getAttribute('src') ?? null, basePath, parseNavPoints(point, basePath))
	})
}

// EPUB 2: <ncx><navMap><navPoint><navLabel><text>Label</text></navLabel><content src="..."/>...
export function parseNcxToc(source: string, ncxPath: string): TocEntry[] {
	const doc = parseXml(source)
	const navMap = doc.getElementsByTagName('navMap')[0]

	return navMap ? parseNavPoints(navMap, ncxPath) : []
}
