// EPUB Canonical Fragment Identifiers (https://www.w3.org/TR/epub-33/#sec-epubcfi), the subset a
// reader needs: point and range CFIs into a chapter document.
//
//   epubcfi(/6/4[chap1]!/4/2[para5]/3:10)
//           └ package ┘ └── chapter ───┘
//   /6/4[chap1]  spine is the 3rd element of the package, chap1 the 2nd itemref
//   /4           <body> (2nd element child of <html>)
//   /2[para5]    1st element child, with its id as an assertion
//   /3:10        text between the 1st and 2nd element children, 10 characters in
//
// Even steps are element children (2 = first). Odd steps are the runs of text between them
// (1 = before the first element), with adjacent text nodes counted as one run.
//
// Paths are computed on the chapter as the engine mounts it, so CFIs generated and resolved here
// always agree. Elements removed by sanitizing (scripts, iframes) shift indices compared to the
// original file, which only matters for CFIs exchanged with other readers. id assertions win over
// indices when resolving, which keeps most such CFIs working anyway.

const ELEMENT_NODE = 1
const TEXT_NODE = 3
const CDATA_SECTION_NODE = 4

// Spine element position inside <package> (metadata, manifest, spine)
const PACKAGE_SPINE_STEP = 6

const STEP_PATTERN = /\/(\d+)(?:\[((?:\^.|[^\]])*)\])?(?::(\d+)(?:\[(?:\^.|[^\]])*\])?)?/g

export interface CfiPoint {
	node: Node
	offset: number // character offset for text nodes, 0 for elements
}

export interface ParsedCfi {
	spineIndex: number
	spineId: string | null
	path: string // chapter-local path, e.g. '/4/2[para5]/3:10', or 'parent,start,end' for ranges
}

interface Step {
	index: number
	id: string | null
	offset: number | null
}

function isElement(node: Node): node is Element {
	return node.nodeType === ELEMENT_NODE
}

function isText(node: Node): node is CharacterData {
	return node.nodeType === TEXT_NODE || node.nodeType === CDATA_SECTION_NODE
}

function escapeAssertion(value: string): string {
	return value.replace(/[\^[\](),;=]/g, '^$&')
}

function unescapeAssertion(value: string): string {
	return value.replace(/\^(.)/g, '$1')
}

function elementStep(element: Element): string {
	let index = 0
	for (let sibling = element.previousElementSibling; sibling; sibling = sibling.previousElementSibling)
		index++

	const id = element.getAttribute('id')

	return `/${(index + 1) * 2}${id ? `[${escapeAssertion(id)}]` : ''}`
}

// The odd step for a text node and how many characters of its run come before it
function textStep(node: Node): { step: number; before: number } {
	let elements = 0
	let before = 0

	for (let sibling = node.parentNode?.firstChild ?? null; sibling && sibling !== node; sibling = sibling.nextSibling) {
		if (isElement(sibling)) {
			elements++
			before = 0
		} else if (isText(sibling)) {
			before += sibling.data.length
		}
	}

	return { step: elements * 2 + 1, before }
}

// Chapter-local path for a DOM position, e.g. a caret position or one end of a selection.
export function cfiPathFromPoint(node: Node, offset: number): string | null {
	const root = node.ownerDocument?.documentElement
	if (!root)
		return null

	let target: Element | null
	let suffix = ''

	if (isText(node)) {
		const { step, before } = textStep(node)
		suffix = `/${step}:${before + offset}`
		target = node.parentElement
	} else if (isElement(node)) {
		// A position between children: point at the child after it, or the element itself at its end
		const child = node.childNodes[offset]
		if (child && isText(child))
			return cfiPathFromPoint(child, 0)

		target = child && isElement(child) ? child : node
	} else {
		return null
	}

	const steps: string[] = []
	let element = target
	while (element && element !== root) {
		steps.unshift(elementStep(element))
		element = element.parentElement
	}

	// Detached from the document, or the point is <html> itself
	if (element !== root || (steps.length === 0 && !suffix))
		return null

	return steps.join('') + suffix
}

function parseSteps(path: string): Step[] | null {
	const steps: Step[] = []
	let consumed = 0

	for (const match of path.matchAll(STEP_PATTERN)) {
		if (match.index !== consumed)
			return null

		consumed += match[0].length
		steps.push({
			index: Number(match[1]),
			id: match[2] !== undefined ? unescapeAssertion(match[2]) : null,
			offset: match[3] !== undefined ? Number(match[3]) : null,
		})
	}

	return consumed === path.length && steps.length > 0 ? steps : null
}

function nthElementChild(parent: Element, n: number): Element | null {
	let child = parent.firstElementChild
	for (let i = 0; child && i < n; i++)
		child = child.nextElementSibling

	return child
}

// Finds the character `offset` inside text run `step` of `parent`. Offsets past the end of the run
// clamp to its end; a run without text resolves to the position where it would be.
function textPoint(parent: Element, step: number, offset: number): CfiPoint {
	const run = (step - 1) / 2
	let elements = 0
	let last: CharacterData | null = null
	let remaining = offset

	for (let child = parent.firstChild; child; child = child.nextSibling) {
		if (isElement(child)) {
			if (elements === run)
				break
			elements++
		} else if (isText(child) && elements === run) {
			if (remaining <= child.data.length)
				return { node: child, offset: remaining }

			remaining -= child.data.length
			last = child
		}
	}

	if (last)
		return { node: last, offset: last.data.length }

	const before = nthElementChild(parent, run)

	return before ? { node: before, offset: 0 } : { node: parent, offset: 0 }
}

// Resolves a chapter-local point path in `doc`. id assertions win over indices, so a CFI keeps
// working when elements before the target were added or removed.
export function pointFromCfiPath(doc: Document, path: string): CfiPoint | null {
	const steps = parseSteps(path)
	if (!steps)
		return null

	let current: Element = doc.documentElement
	for (const [i, step] of steps.entries()) {
		if (step.index % 2 === 1) {
			// Text runs can only be the last step
			if (i !== steps.length - 1)
				return null

			return textPoint(current, step.index, step.offset ?? 0)
		}

		const byId = step.id ? doc.getElementById(step.id) : null
		const child = byId ?? nthElementChild(current, step.index / 2 - 1)
		if (!child)
			return null

		current = child
	}

	return { node: current, offset: 0 }
}

function splitSteps(path: string): string[] {
	return Array.from(path.matchAll(STEP_PATTERN), (match) => match[0])
}

// Range path 'parent,start,end'. The parent holds the steps both ends share; each end keeps at
// least its last step, as the spec requires.
export function cfiRangePath(range: Range): string | null {
	const start = cfiPathFromPoint(range.startContainer, range.startOffset)
	const end = cfiPathFromPoint(range.endContainer, range.endOffset)
	if (!start || !end)
		return null

	const startSteps = splitSteps(start)
	const endSteps = splitSteps(end)
	let shared = 0
	while (shared < startSteps.length - 1 && shared < endSteps.length - 1 && startSteps[shared] === endSteps[shared])
		shared++

	const parent = startSteps.slice(0, shared).join('')

	return `${parent},${startSteps.slice(shared).join('')},${endSteps.slice(shared).join('')}`
}

// Splits on the two top-level commas, ignoring '^,' escapes inside assertions
function splitRangePath(path: string): [string, string, string] | null {
	const parts: string[] = []
	let current = ''

	for (let i = 0; i < path.length; i++) {
		const char = path[i]
		if (char === '^') {
			current += char + (path[i + 1] ?? '')
			i++
		} else if (char === ',') {
			parts.push(current)
			current = ''
		} else {
			current += char
		}
	}
	parts.push(current)

	return parts.length === 3 ? [parts[0], parts[1], parts[2]] : null
}

export function rangeFromCfiRangePath(doc: Document, path: string): Range | null {
	const parts = splitRangePath(path)
	if (!parts)
		return null

	const [parent, start, end] = parts
	const startPoint = pointFromCfiPath(doc, parent + start)
	const endPoint = pointFromCfiPath(doc, parent + end)
	if (!startPoint || !endPoint)
		return null

	const range = doc.createRange()
	try {
		range.setStart(startPoint.node, startPoint.offset)
		range.setEnd(endPoint.node, endPoint.offset)
	} catch {
		return null
	}

	return range
}

export function isRangePath(path: string): boolean {
	return splitRangePath(path) !== null
}

export function buildCfi(spineIndex: number, spineId: string | null, path: string): string {
	const assertion = spineId ? `[${escapeAssertion(spineId)}]` : ''

	return `epubcfi(/${PACKAGE_SPINE_STEP}/${(spineIndex + 1) * 2}${assertion}!${path})`
}

export function parseCfi(cfi: string): ParsedCfi | null {
	const match = /^epubcfi\((.*)\)$/.exec(cfi.trim())
	if (!match)
		return null

	const inner = match[1]
	const bang = inner.indexOf('!')
	if (bang < 0)
		return null

	const packageSteps = parseSteps(inner.slice(0, bang))
	const path = inner.slice(bang + 1)
	if (!packageSteps || packageSteps.length !== 2 || packageSteps[1].index % 2 !== 0 || !path)
		return null

	const spineStep = packageSteps[1]

	return { spineIndex: spineStep.index / 2 - 1, spineId: spineStep.id, path }
}

// Which spine item a CFI points at: the itemref id assertion wins over the index.
export function resolveCfiSpineIndex(parsed: ParsedCfi, spine: { id: string }[]): number | null {
	if (parsed.spineId) {
		const byId = spine.findIndex((item) => item.id === parsed.spineId)
		if (byId >= 0)
			return byId
	}

	return parsed.spineIndex >= 0 && parsed.spineIndex < spine.length ? parsed.spineIndex : null
}
