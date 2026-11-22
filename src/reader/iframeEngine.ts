import { buildBookUrl } from '../shared/bookUrl'
import { chapterSrcdoc, mountChapter, parseChapter, sanitizeChapter } from './chapterDocument'
import { createLocator, pageToProgression, progressionToPage } from './locator'
import { isAtEnd, isAtStart, nextStep, prevStep, type NavigationStep } from './navigation'
import { countPages, paginationCss, READER_DEFAULTS_CSS, type PageLayout } from './pagination'
import { DEFAULT_SETTINGS, settingsCss, type ReaderSettings } from './settings'
import type { ReaderBook, ReaderEngine, ReadingFlow, RelocateEvent } from './types'

const MARGIN_X = 24
const MARGIN_Y = 32

// Longest we wait for images/fonts before the first measurement; late ones trigger a relayout.
const RESOURCE_TIMEOUT_MS = 2000

const CHAPTER_ERROR_HTML = '<p style="text-align:center;margin-top:40vh;opacity:.6">This chapter could not be loaded.</p>'

export interface IframeEngineOptions {
	onExternalLink?: (url: string) => void
}

// Renders one chapter at a time into a sandboxed iframe and paginates it with CSS columns.
// The iframe gets 'allow-same-origin' (so this code can lay out and measure the chapter) but not
// 'allow-scripts', so nothing inside a book can run.
export function createIframeEngine(container: HTMLElement, options: IframeEngineOptions = {}): ReaderEngine {
	const iframe = document.createElement('iframe')
	iframe.setAttribute('sandbox', 'allow-same-origin')
	iframe.setAttribute('title', 'Book content')
	iframe.style.cssText = 'display:block;width:100%;height:100%;border:0;background:transparent'
	container.appendChild(iframe)

	const listeners = new Set<(event: RelocateEvent) => void>()

	let book: ReaderBook | null = null
	let spineIndex = 0
	let pageIndex = 0
	let pageCount: number | null = null
	// Progression the reader navigated to. Relayouts (resize, late images) map this back to a page
	// instead of the current page number, so the same text stays in view and repeated resizes don't drift.
	let anchor = 0

	let settings: ReaderSettings = DEFAULT_SETTINGS
	let layout: PageLayout | null = null
	let settingsStyle: HTMLStyleElement | null = null
	let layoutStyle: HTMLStyleElement | null = null
	let loadToken = 0
	let relayoutFrame: number | null = null
	let detachDocument: (() => void) | null = null

	function emit() {
		if (!book || pageCount === null)
			return

		const position = { spineIndex, pageIndex, pageCount }
		const event: RelocateEvent = {
			locator: createLocator(book.spine, spineIndex, anchor),
			atStart: isAtStart(position),
			atEnd: isAtEnd(position, book.spine.length),
			page: { index: pageIndex, count: pageCount },
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

	function relayout() {
		const doc = iframe.contentDocument
		const width = container.clientWidth
		const height = container.clientHeight
		if (!doc || !layoutStyle || width === 0 || height === 0)
			return

		layout = { width, height, marginX: MARGIN_X, marginY: MARGIN_Y }
		layoutStyle.textContent = paginationCss(layout)

		// Reading scrollWidth forces a synchronous layout with the new CSS
		pageCount = countPages(doc.documentElement.scrollWidth, width)
		showPage(progressionToPage(anchor, pageCount))
	}

	function scheduleRelayout() {
		if (relayoutFrame !== null || pageCount === null)
			return

		relayoutFrame = requestAnimationFrame(() => {
			relayoutFrame = null
			relayout()
		})
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

	// Input inside the iframe never reaches the app, so keys and wheel are re-dispatched on the
	// container (where the reader's input hook listens) and links are handled here.
	function attachDocument(doc: Document): () => void {
		const win = doc.defaultView

		const onKeyDown = (e: KeyboardEvent) => {
			container.dispatchEvent(new KeyboardEvent('keydown', {
				key: e.key, code: e.code, ctrlKey: e.ctrlKey, altKey: e.altKey,
				shiftKey: e.shiftKey, metaKey: e.metaKey, bubbles: true, cancelable: true,
			}))
		}

		const onWheel = (e: WheelEvent) => {
			e.preventDefault()
			container.dispatchEvent(new WheelEvent('wheel', {
				deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode, bubbles: true, cancelable: true,
			}))
		}

		const onClick = (e: MouseEvent) => {
			const target = e.target instanceof Element ? e.target.closest('a[href]') : null
			if (!target)
				return

			e.preventDefault()
			const url = new URL(target.getAttribute('href') ?? '', doc.baseURI)
			if (url.protocol === 'http:' || url.protocol === 'https:')
				options.onExternalLink?.(url.href)
			// Links inside the book are handled once TOC/link navigation exists (step 8)
		}

		// Text selection and focus can scroll the hidden overflow; snap back to the current page
		const onScroll = () => {
			if (layout && win && win.scrollX !== pageIndex * layout.width)
				scrollToPage()
		}

		// Images that finish after the first measurement can change the page count
		const onResourceLoad = (e: Event) => {
			if (e.target instanceof HTMLImageElement)
				scheduleRelayout()
		}

		doc.addEventListener('keydown', onKeyDown)
		doc.addEventListener('wheel', onWheel, { passive: false })
		doc.addEventListener('click', onClick)
		doc.addEventListener('load', onResourceLoad, true)
		doc.fonts.addEventListener('loadingdone', scheduleRelayout)
		win?.addEventListener('scroll', onScroll)

		return () => {
			doc.removeEventListener('keydown', onKeyDown)
			doc.removeEventListener('wheel', onWheel)
			doc.removeEventListener('click', onClick)
			doc.removeEventListener('load', onResourceLoad, true)
			doc.fonts.removeEventListener('loadingdone', scheduleRelayout)
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

	async function loadChapter(index: number, progression: number) {
		if (!book)
			return

		const token = ++loadToken
		spineIndex = index
		pageIndex = 0
		pageCount = null
		anchor = progression

		const url = buildBookUrl(book.id, book.spine[index].href)
		const source = await fetchChapter(url)
		if (token !== loadToken)
			return

		detachDocument?.()
		detachDocument = null

		const loaded = waitForLoad()
		iframe.srcdoc = chapterSrcdoc(url)
		await loaded
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

		relayout()
	}

	async function applyStep(step: NavigationStep) {
		if (step.type === 'page' && pageCount !== null) {
			anchor = pageToProgression(step.pageIndex, pageCount)
			showPage(step.pageIndex)
		} else if (step.type === 'chapter') {
			await loadChapter(step.spineIndex, step.progression)
		}
	}

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

			if (target.spineIndex === spineIndex && pageCount !== null) {
				anchor = target.progression
				showPage(progressionToPage(anchor, pageCount))
			} else {
				await loadChapter(target.spineIndex, target.progression)
			}
		},

		async next() {
			if (book)
				await applyStep(nextStep({ spineIndex, pageIndex, pageCount }, book.spine.length))
		},

		async prev() {
			if (book)
				await applyStep(prevStep({ spineIndex, pageIndex, pageCount }))
		},

		setFlow(flow: ReadingFlow) {
			// Scrolled flow arrives in step 7
			if (flow !== 'paginated')
				return Promise.reject(new Error(`Reading flow '${flow}' is not supported yet`))

			return Promise.resolve()
		},

		setSettings(nextSettings) {
			settings = nextSettings
			if (!settingsStyle)
				return

			settingsStyle.textContent = settingsCss(settings)
			// Font size and line height change the page count; the anchor keeps the same text in view
			if (pageCount !== null)
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
			detachDocument?.()
			listeners.clear()
			iframe.remove()
		},
	}
}
