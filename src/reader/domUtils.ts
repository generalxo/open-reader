// DOM checks that work across realms. The chapter document lives in an iframe with its own
// globals, so its nodes are never `instanceof` this window's Element/HTMLImageElement; checks
// based on nodeType/localName work for nodes from any realm.

const ELEMENT_NODE = 1
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

function asElement(target: EventTarget | Node | null): Element | null {
	const node = target as Node | null
	if (!node || typeof node.nodeType !== 'number')
		return null

	if (node.nodeType === ELEMENT_NODE)
		return node as Element

	// e.g. a click that lands on a text node
	return node.parentElement
}

export function linkHref(link: Element): string | null {
	return link.getAttribute('href') ?? link.getAttributeNS(XLINK_NAMESPACE, 'href')
}

// The <a> (HTML or SVG) a click happened in, if it has a target.
export function closestLink(target: EventTarget | Node | null): Element | null {
	let element = asElement(target)

	while (element) {
		if (element.localName === 'a' && linkHref(element) !== null)
			return element

		element = element.parentElement
	}

	return null
}

export function isImage(target: EventTarget | Node | null): boolean {
	const node = target as Node | null

	return !!node && node.nodeType === ELEMENT_NODE && (node as Element).localName === 'img'
}
