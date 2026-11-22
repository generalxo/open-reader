import { buildBookUrl, resolveBookHref } from '../shared/bookUrl'
import { chapterSrcdoc, mountChapter, parseChapter, sanitizeChapter } from './chapterDocument'
import { closestLink, isImage, linkHref } from './domUtils'
import { clamp01, createLocator, pageToProgression, progressionToPage, progressionToScroll, scrollToProgression } from './locator'
import {
	isAtEnd,
	isAtStart,
	isScrolledToBottom,
	isScrolledToTop,
	nextScrollStep,
	nextStep,
	prevScrollStep,
	prevStep,
	type NavigationStep,
	type ScrollPosition,
} from './navigation'
import { countPages, paginationCss, READER_DEFAULTS_CSS, scrolledCss, type PageLayout } from './pagination'
import { DEFAULT_SETTINGS, settingsCss, type ReaderSettings } from './settings'
import type { ReaderBook, ReaderEngine, ReadingFlow, RelocateEvent } from './types'

const MARGIN_X = 24
const MARGIN_Y = 32

// Longest we wait for images/fonts before the first measurement; late ones trigger a relayout.
const RESOURCE_TIMEOUT_MS = 2000

// Scrolled flow: how long the reader must rest at a chapter edge before wheeling further moves
// to the next/previous chapter, so the momentum of one fling doesn't skip a chapter.
const EDGE_DWELL_MS = 400

const CHAPTER_ERROR_HTML = '<p style="text-align:center;margin-top:40vh;opacity:.6">This chapter could not be loaded.</p>'

export interface IframeEngineOptions {
	onExternalLink?: (url: string) => void
}

// Renders one chapter at a time into a sandboxed iframe, either paginated with CSS columns or as
// one scrolling column. The iframe gets 'allow-same-origin' (so this code can lay out and measure
// the chapter) but not 'allow-scripts', so nothing inside a book can run.
export function createIframeEngine(container: HTMLElement, options: IframeEngineOptions = {}): ReaderEngine {
	const iframe = document.createElement('iframe')
	iframe.setAttribute('sandbox', 'allow-same-origin')
	iframe.setAttribute('title', 'Book content')
	iframe.style.cssText = 'display:block;width:100%;height:100%;border:0;background:transparent'
	container.appendChild(iframe)

	const listeners = new Set<(event: RelocateEvent) => void>()

	let book: ReaderBook | null = null
	let flow: ReadingFlow = 'paginated'
	let settings: ReaderSettings = DEFAULT_SETTINGS
	let spineIndex = 0
	let loaded = false
	let pageIndex = 0
	let pageCount = 1
	// Progression the reader navigated to. Relayouts (resize, settings, flow switch) map this back
	// to a page or scroll offset, so the same text stays in view and repeated resizes don't drift.
	let anchor = 0
	// Scrolled flow: when the current chapter edge (top or bottom) was reached, null if not at one
	let edgeSince: number | null = null

	let layout: PageLayout | null = null
	let settingsStyle: HTMLStyleElement | null = null
	let layoutStyle: HTMLStyleElement | null = null
	let loadToken = 0
	let relayoutFrame: number | null = null
	let scrollFrame: number | null = null
	let detachDocument: (() => void) | null = null
	// True while the engine itself is loading a chapter document into the iframe
	let expectingLoad = false

	function scrollPosition(): ScrollPosition {
		const element = iframe.contentDocument?.scrollingElement

		return {
			spineIndex,
			scrollTop: element?.scrollTop ?? 0,
			scrollHeight: element?.scrollHeight ?? 0,
			clientHeight: element?.clientHeight ?? 0,
		}
	}

	function emit() {
		if (!book || !loaded)
			return

		const lastIndex = book.spine.length - 1
		let event: RelocateEvent
		if (flow === 'paginated') {
			const position = { spineIndex, pageIndex, pageCount }
			event = {
				locator: createLocator(book.spine, spineIndex, anchor),
				atStart: isAtStart(position),
				atEnd: isAtEnd(position, book.spine.length),
				page: { index: pageIndex, count: pageCount },
			}
		} else {
			const position = scrollPosition()
			event = {
				locator: createLocator(book.spine, spineIndex, anchor),
				atStart: spineIndex === 0 && isScrolledToTop(position),
				atEnd: spineIndex === lastIndex && isScrolledToBottom(position),
				page: null,
			}
		}

		for (const listener of listeners)
			listener(event)
	}

	function scrollToPage() {
		if (layout)
			iframe.contentWindow?.scrollTo(pageIndex * layout.width, 0)
	}

	function showPage(index: number) {
		pageIndex = index
		scrollToPage()
		emit()
	}

	function updateEdge() {
		const position = scrollPosition()
		const atEdge = isScrolledToTop(position) || isScrolledToBottom(position)

		if (!atEdge)
			edgeSince = null
		else if (edgeSince === null)
			edgeSince = Date.now()
	}

	// Where an element (by id, or legacy <a name>) sits in the laid-out chapter, as a progression,
	// so jumping to it goes through the same anchor as every other position.
	function fragmentProgression(fragment: string): number | null {
		const doc = iframe.contentDocument
		const win = doc?.defaultView
		const target = doc?.getElementById(fragment) ?? doc?.getElementsByName(fragment)[0]
		if (!doc || !win || !target || !layout)
			return null

		const rect = target.getBoundingClientRect()
		if (flow === 'paginated') {
			const page = Math.min(pageCount - 1, Math.max(0, Math.floor((rect.left + win.scrollX) / layout.width)))

			return pageToProgression(page, pageCount)
		}

		const scrollHeight = doc.scrollingElement?.scrollHeight ?? 0

		return scrollHeight > 0 ? clamp01((rect.top + win.scrollY) / scrollHeight) : null
	}

	function jumpToFragment(fragment: string | null | undefined) {
		anchor = (fragment ? fragmentProgression(fragment) : null) ?? 0
		relayout()
	}

	async function goToHref(href: string, fragment?: string | null) {
		if (!book)
			return

		const index = book.spine.findIndex((item) => item.href === href)
		if (index < 0)
			return

		if (index === spineIndex && loaded)
			jumpToFragment(fragment)
		else
			await loadChapter(index, 0, fragment)
	}

	function relayout() {
		const doc = iframe.contentDocument
		const width = container.clientWidth
		const height = container.clientHeight
		if (!doc || !layoutStyle || width === 0 || height === 0)
			return

		layout = { width, height, marginX: MARGIN_X, marginY: MARGIN_Y }

		if (flow === 'paginated') {
			layoutStyle.textContent = paginationCss(layout)
			// Reading scrollWidth forces a synchronous layout with the new CSS
			pageCount = countPages(doc.documentElement.scrollWidth, width)
			showPage(progressionToPage(anchor, pageCount))
		} else {
			layoutStyle.textContent = scrolledCss(layout)
			const element = doc.scrollingElement
			iframe.contentWindow?.scrollTo(0, element ? progressionToScroll(anchor, element.scrollHeight, element.clientHeight) : 0)
			updateEdge()
			emit()
		}
	}

	function scheduleRelayout() {
		if (relayoutFrame !== null || !loaded)
			return

		relayoutFrame = requestAnimationFrame(() => {
			relayoutFrame = null
			relayout()
		})
	}

	// Late images/fonts change the page count in paginated flow. In scrolled flow the browser's
	// scroll anchoring already keeps the visible text in place, so nothing needs to move.
	function onContentResize() {
		if (flow === 'paginated')
			scheduleRelayout()
	}

	function waitForLoad(): Promise<void> {
		return new Promise((resolve) => iframe.addEventListener('load', () => resolve(), { once: true }))
	}

	function waitForResources(doc: Document): Promise<void> {
		const images = Array.from(doc.images).filter((img) => !img.complete)
		const imagesLoaded = images.map((img) => new Promise<void>((resolve) => {
			img.addEventListener('load', () => resolve(), { once: true })
			img.addEventListener('error', () => resolve(), { once: true })
		}))
		const timeout = new Promise<void>((resolve) => setTimeout(resolve, RESOURCE_TIMEOUT_MS))

		return Promise.race([Promise.all([doc.fonts.ready, ...imagesLoaded]).then(() => undefined), timeout])
	}

	// Input inside the iframe never reaches the app, so keys and page-turning wheel events are
	// re-dispatched on the container (where the reader's input hook listens) and links are handled here.
	function attachDocument(doc: Document): () => void {
		const win = doc.defaultView

		const onKeyDown = (e: KeyboardEvent) => {
			const forwarded = new KeyboardEvent('keydown', {
				key: e.key, code: e.code, ctrlKey: e.ctrlKey, altKey: e.altKey,
				shiftKey: e.shiftKey, metaKey: e.metaKey, bubbles: true, cancelable: true,
			})
			// If the app handled the key (page turn), stop the iframe from also scrolling natively
			if (!container.dispatchEvent(forwarded))
				e.preventDefault()
		}

		const forwardWheel = (e: WheelEvent) => {
			e.preventDefault()
			container.dispatchEvent(new WheelEvent('wheel', {
				deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode, bubbles: true, cancelable: true,
			}))
		}

		// Paginated: every wheel gesture turns a page. Scrolled: the wheel scrolls natively, and only
		// moves to another chapter after resting at the top/bottom edge for a moment.
		const onWheel = (e: WheelEvent) => {
			if (flow === 'paginated') {
				forwardWheel(e)
				return
			}

			const position = scrollPosition()
			const pushingPastEdge = (e.deltaY > 0 && isScrolledToBottom(position)) || (e.deltaY < 0 && isScrolledToTop(position))
			if (pushingPastEdge && edgeSince !== null && Date.now() - edgeSince >= EDGE_DWELL_MS)
				forwardWheel(e)
		}

		// Never let a click navigate the iframe itself: that would replace the chapter with a raw
		// cross-origin book:// page the engine can no longer reach.
		const onClick = (e: MouseEvent) => {
			const target = closestLink(e.target)
			if (!target)
				return

			e.preventDefault()
			const href = linkHref(target) ?? ''
			const internal = book ? resolveBookHref(book.spine[spineIndex].href, href) : null
			if (internal) {
				// Footnotes, cross references and in-book TOCs; links to non-spine files are ignored
				void goToHref(internal.entryPath, internal.fragment)
				return
			}

			let url: URL
			try {
				url = new URL(href, doc.baseURI)
			} catch {
				return
			}

			if (url.protocol === 'http:' || url.protocol === 'https:')
				options.onExternalLink?.(url.href)
		}

		const onScroll = () => {
			// Paginated: text selection and focus can scroll the hidden overflow; snap back to the page
			if (flow === 'paginated') {
				if (layout && win && win.scrollX !== pageIndex * layout.width)
					scrollToPage()
				return
			}

			if (scrollFrame !== null)
				return

			scrollFrame = requestAnimationFrame(() => {
				scrollFrame = null
				const position = scrollPosition()
				anchor = scrollToProgression(position.scrollTop, position.scrollHeight)
				updateEdge()
				emit()
			})
		}

		const onResourceLoad = (e: Event) => {
			if (isImage(e.target))
				onContentResize()
		}

		doc.addEventListener('keydown', onKeyDown)
		doc.addEventListener('wheel', onWheel, { passive: false })
		doc.addEventListener('click', onClick)
		doc.addEventListener('load', onResourceLoad, true)
		doc.fonts.addEventListener('loadingdone', onContentResize)
		win?.addEventListener('scroll', onScroll)

		return () => {
			try {
				removeListeners()
			} catch {
				// The document is already gone or no longer same-origin; its listeners went with it
			}
		}

		function removeListeners() {
			doc.removeEventListener('keydown', onKeyDown)
			doc.removeEventListener('wheel', onWheel)
			doc.removeEventListener('click', onClick)
			doc.removeEventListener('load', onResourceLoad, true)
			doc.fonts.removeEventListener('loadingdone', onContentResize)
			win?.removeEventListener('scroll', onScroll)
		}
	}

	async function fetchChapter(url: string): Promise<Document | null> {
		try {
			const response = await fetch(url)
			if (!response.ok)
				return null

			const source = parseChapter(await response.text(), response.headers.get('Content-Type') ?? '')
			sanitizeChapter(source)

			return source
		} catch {
			return null
		}
	}

	async function loadChapter(index: number, progression: number, fragment?: string | null) {
		if (!book)
			return

		const token = ++loadToken
		spineIndex = index
		loaded = false
		pageIndex = 0
		pageCount = 1
		anchor = progression
		edgeSince = null

		const url = buildBookUrl(book.id, book.spine[index].href)
		const source = await fetchChapter(url)
		if (token !== loadToken)
			return

		detachDocument?.()
		detachDocument = null

		const loadedDocument = waitForLoad()
		expectingLoad = true
		iframe.srcdoc = chapterSrcdoc(url)
		await loadedDocument
		if (token !== loadToken)
			return

		const doc = iframe.contentDocument
		if (!doc)
			return

		const defaults = doc.createElement('style')
		defaults.textContent = READER_DEFAULTS_CSS
		doc.head.appendChild(defaults)

		if (source)
			mountChapter(doc, source)
		else
			doc.body.innerHTML = CHAPTER_ERROR_HTML

		// Cascade: defaults < book CSS < user settings < layout
		settingsStyle = doc.createElement('style')
		settingsStyle.textContent = settingsCss(settings)
		doc.head.appendChild(settingsStyle)

		layoutStyle = doc.createElement('style')
		doc.head.appendChild(layoutStyle)
		detachDocument = attachDocument(doc)

		await waitForResources(doc)
		if (token !== loadToken)
			return

		loaded = true
		relayout()

		// The element's position is only known once the chapter is laid out
		if (fragment)
			jumpToFragment(fragment)
	}

	async function applyStep(step: NavigationStep) {
		if (step.type === 'page') {
			anchor = pageToProgression(step.pageIndex, pageCount)
			showPage(step.pageIndex)
		} else if (step.type === 'scroll') {
			// The scroll listener updates the anchor and emits as the smooth scroll progresses
			iframe.contentWindow?.scrollTo({ top: step.scrollTop, behavior: 'smooth' })
		} else if (step.type === 'chapter') {
			await loadChapter(step.spineIndex, step.progression)
		}
	}

	// Safety net: if the iframe ever loads a document the engine didn't ask for (a navigation that
	// slipped past the click handler), put the current chapter back instead of losing the reader.
	iframe.addEventListener('load', () => {
		if (expectingLoad) {
			expectingLoad = false
			return
		}

		if (book)
			void loadChapter(spineIndex, anchor)
	})

	const resizeObserver = new ResizeObserver(() => scheduleRelayout())
	resizeObserver.observe(container)

	return {
		async open(nextBook, at) {
			book = nextBook
			if (book.spine.length === 0)
				return

			await loadChapter(at?.spineIndex ?? 0, at?.progression ?? 0)
		},

		async goTo(target) {
			if (!book)
				return

			if (target.spineIndex === spineIndex && loaded) {
				anchor = target.progression
				relayout()
			} else {
				await loadChapter(target.spineIndex, target.progression)
			}
		},

		goToHref,

		async next() {
			if (!book || !loaded)
				return

			const step = flow === 'paginated'
				? nextStep({ spineIndex, pageIndex, pageCount }, book.spine.length)
				: nextScrollStep(scrollPosition(), book.spine.length)
			await applyStep(step)
		},

		async prev() {
			if (!book || !loaded)
				return

			const step = flow === 'paginated'
				? prevStep({ spineIndex, pageIndex, pageCount })
				: prevScrollStep(scrollPosition())
			await applyStep(step)
		},

		setFlow(nextFlow) {
			if (nextFlow === flow)
				return Promise.resolve()

			flow = nextFlow
			edgeSince = null
			// Both flows measure position as progression through the chapter, so the anchor carries over
			if (loaded)
				relayout()

			return Promise.resolve()
		},

		setSettings(nextSettings) {
			settings = nextSettings
			if (!settingsStyle)
				return

			settingsStyle.textContent = settingsCss(settings)
			// Font size and line height change the layout; the anchor keeps the same text in view
			if (loaded)
				relayout()
		},

		onRelocate(listener) {
			listeners.add(listener)

			return () => listeners.delete(listener)
		},

		destroy() {
			loadToken++
			resizeObserver.disconnect()
			if (relayoutFrame !== null)
				cancelAnimationFrame(relayoutFrame)
			if (scrollFrame !== null)
				cancelAnimationFrame(scrollFrame)
			detachDocument?.()
			listeners.clear()
			iframe.remove()
		},
	}
}
