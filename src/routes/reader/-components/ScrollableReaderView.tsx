import { useRef, useEffect } from 'react'
import type { SpineItem } from '../../../types/models/spineItem'
import type { ChapterBundle } from '../../../types/models/chapterBundle'

const READER_DEFAULTS = `
	div {
		font-size: 1rem;
		line-height: 1.6;
	}
	.chapter-content {
		max-width: 70ch;
		margin: 0 auto;
		padding: 0 1.5rem;
	}
	.chapter-placeholder {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #94a3b8;
		font-size: 0.875rem;
	}
	p {
		margin: 0 0 0.75em 0;
	}
	a:not([href]) {
		color: inherit;
		text-decoration: none;
		cursor: text;
	}
`

interface ScrollableReaderViewProps {
	spine: SpineItem[]
	loadedBundles: Map<number, ChapterBundle>
	onCurrentChapterChange: (index: number) => void
}

export default function ScrollableReaderView({ spine, loadedBundles, onCurrentChapterChange }: ScrollableReaderViewProps) {
	const hostRef = useRef<HTMLDivElement>(null)
	const shadowRef = useRef<ShadowRoot | null>(null)
	const chapterDivsRef = useRef<Map<number, HTMLDivElement>>(new Map())
	const stylesContainerRef = useRef<HTMLDivElement | null>(null)
	const currentIndexRef = useRef(0)
	const rafRef = useRef<number | null>(null)

	useEffect(() => {
		const host = hostRef.current
		if (!host) return

		// Reuse an existing shadow root if present (React StrictMode runs effects twice;
		// attachShadow throws on the second call since the root can't be detached).
		const isFirstRun = !shadowRef.current
		const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
		shadowRef.current = shadow

		if (isFirstRun) {
			const defaultsStyle = document.createElement('style')
			defaultsStyle.textContent = READER_DEFAULTS
			shadow.appendChild(defaultsStyle)

			const stylesContainer = document.createElement('div')
			stylesContainerRef.current = stylesContainer
			shadow.appendChild(stylesContainer)

			for (let i = 0; i < spine.length; i++) {
				const chapterDiv = document.createElement('div')
				chapterDiv.className = 'chapter-placeholder'
				chapterDiv.textContent = 'Loading…'
				shadow.appendChild(chapterDiv)
				chapterDivsRef.current.set(i, chapterDiv)
			}
		}

		const handleClick = (e: Event) => {
			const target = (e.target as Element).closest('a')
			if (!target) return
			const href = target.getAttribute('href')
			if (!href) return
			e.preventDefault()
			if (href.startsWith('http://') || href.startsWith('https://'))
				window.electronAPI.native.openExternal(href)
		}
		shadow.addEventListener('click', handleClick)

		return () => shadow.removeEventListener('click', handleClick)
		// spine is stable after mount (ReaderContainer only renders once spine is loaded)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	useEffect(() => {
		const stylesContainer = stylesContainerRef.current
		if (!stylesContainer) return

		const seenStyles = new Set<string>()
		for (const [, bundle] of loadedBundles) {
			for (const css of bundle.styles) seenStyles.add(css)
		}
		stylesContainer.innerHTML = ''
		for (const css of seenStyles) {
			const style = document.createElement('style')
			style.textContent = css
			stylesContainer.appendChild(style)
		}

		for (const [index, chapterDiv] of chapterDivsRef.current) {
			const bundle = loadedBundles.get(index)
			const isLoaded = chapterDiv.dataset.loaded === 'true'

			if (bundle && !isLoaded) {
				chapterDiv.innerHTML = bundle.html
				chapterDiv.className = 'chapter-content'
				chapterDiv.dataset.loaded = 'true'
			} else if (!bundle && isLoaded) {
				chapterDiv.innerHTML = ''
				chapterDiv.className = 'chapter-placeholder'
				chapterDiv.textContent = 'Loading…'
				delete chapterDiv.dataset.loaded
			}
		}
	}, [loadedBundles])

	useEffect(() => {
		const host = hostRef.current
		if (!host) return

		const onScroll = () => {
			if (rafRef.current !== null) return
			rafRef.current = requestAnimationFrame(() => {
				rafRef.current = null
				const hostRect = host.getBoundingClientRect()
				const midpoint = hostRect.top + hostRect.height / 2

				let curr = 0
				for (const [idx, chapterDiv] of chapterDivsRef.current) {
					if (chapterDiv.getBoundingClientRect().top <= midpoint) curr = idx
				}

				if (curr !== currentIndexRef.current) {
					currentIndexRef.current = curr
					onCurrentChapterChange(curr)
				}
			})
		}

		host.addEventListener('scroll', onScroll, { passive: true })
		return () => {
			host.removeEventListener('scroll', onScroll)
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
		}
	}, [onCurrentChapterChange])

	return <div ref={hostRef} className="h-full overflow-y-auto no-scrollbar" />
}
