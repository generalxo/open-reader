// Turns a chapter file fetched from book:// into nodes the engine can mount in its iframe.
// The iframe is sandboxed without allow-scripts, so nothing here is the only line of defence;
// sanitizing just keeps the mounted document free of things that can never work anyway.

const XML_CONTENT_TYPES = ['application/xhtml+xml', 'application/xml', 'text/xml', 'image/svg+xml']

const REMOVED_ELEMENTS = 'script, base, meta, iframe, frame, object, embed, noscript'

// XHTML is parsed as XML so self-closing tags (<div/>, <a id="x"/>) don't swallow the content
// after them. Books with broken XML fall back to the forgiving HTML parser.
export function parseChapter(source: string, contentType: string): Document {
	const parser = new DOMParser()
	const mimeType = contentType.split(';')[0].trim().toLowerCase()

	if (XML_CONTENT_TYPES.includes(mimeType)) {
		const doc = parser.parseFromString(source, 'application/xhtml+xml')
		if (doc.getElementsByTagName('parsererror').length === 0)
			return doc
	}

	return parser.parseFromString(source, 'text/html')
}

export function sanitizeChapter(doc: Document): void {
	for (const element of Array.from(doc.querySelectorAll(REMOVED_ELEMENTS)))
		element.remove()

	for (const element of Array.from(doc.querySelectorAll('*'))) {
		for (const attr of Array.from(element.attributes)) {
			const isHandler = attr.localName.toLowerCase().startsWith('on')
			const isScriptUrl = attr.value.trim().toLowerCase().startsWith('javascript:')
			if (isHandler || isScriptUrl)
				element.removeAttributeNode(attr)
		}
	}
}

function copyAttributes(from: Element, to: Element): void {
	for (const attr of Array.from(from.attributes)) {
		try {
			to.setAttributeNS(attr.namespaceURI, attr.name, attr.value)
		} catch {
			// Attribute names that are valid XML but not valid here are skipped
		}
	}
}

function findChild(doc: Document, localName: string): Element | null {
	return Array.from(doc.documentElement.children).find((child) => child.localName === localName) ?? null
}

// Moves the chapter's <head> content (stylesheets, <style>, <title>), its <body> content and the
// attributes on <html>/<body> (class, lang, dir, epub:type...) into the target document.
// Keeping those attributes is what makes book CSS like `body.calibre { ... }` apply.
export function mountChapter(target: Document, source: Document): void {
	copyAttributes(source.documentElement, target.documentElement)

	const head = findChild(source, 'head')
	for (const node of Array.from(head?.childNodes ?? []))
		target.head.appendChild(target.importNode(node, true))

	const body = findChild(source, 'body')
	if (body) {
		copyAttributes(body, target.body)
		for (const node of Array.from(body.childNodes))
			target.body.appendChild(target.importNode(node, true))
	} else {
		// e.g. an SVG-only spine item
		target.body.appendChild(target.importNode(source.documentElement, true))
	}
}

function escapeAttribute(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

// Empty document the chapter is mounted into. <base> makes the chapter's relative links,
// images and stylesheets resolve against its book:// URL instead of the app's URL.
export function chapterSrcdoc(chapterUrl: string): string {
	return `<!DOCTYPE html><html><head><meta charset="utf-8"><base href="${escapeAttribute(chapterUrl)}"></head><body></body></html>`
}
