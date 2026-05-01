import { useEffect, useRef, useState } from 'react'
import type { ChapterBundle } from '../../../types/models/chapterBundle'

const PAGED_DEFAULTS = `
	body, div {
		font-size: 1rem;
		line-height: 1.6;
	}
	p {
		margin: 0 0 0.75em 0;
	}
	a:not([href]) {
		color: inherit;
		text-decoration: none;
		cursor: text;
	}
	* {
		break-before: auto !important;
		break-after: auto !important;
		page-break-before: auto !important;
		page-break-after: auto !important;
	}
`

interface PagedReaderViewProps {
	bundle: ChapterBundle
	pageIndex: number
	onPageCountReady: (count: number) => void
}

export default function PagedReaderView({ bundle, pageIndex, onPageCountReady }: PagedReaderViewProps) {
	const hostRef = useRef<HTMLDivElement>(null)
	const contentRef = useRef<HTMLDivElement | null>(null)
	const onPageCountReadyRef = useRef(onPageCountReady)
	const layoutWidthRef = useRef(0)
	const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

	useEffect(() => {
		onPageCountReadyRef.current = onPageCountReady
	}, [onPageCountReady])

	useEffect(() => {
		const host = hostRef.current
		if (!host) return

		const observer = new ResizeObserver(entries => {
			const { width, height } = entries[0].contentRect
			setContainerSize({ width, height })
		})
		observer.observe(host)
		return () => observer.disconnect()
	}, [])

	useEffect(() => {
		const host = hostRef.current
		if (!host) return

		const { width, height } = containerSize.width > 0
			? containerSize
			: host.getBoundingClientRect()

		layoutWidthRef.current = width

		const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
		shadow.replaceChildren()

		for (const css of bundle.styles) {
			const styleEl = document.createElement('style')
			styleEl.textContent = css
			shadow.appendChild(styleEl)
		}

		const defaults = document.createElement('style')
		defaults.textContent = PAGED_DEFAULTS
		shadow.appendChild(defaults)

		const layoutStyle = document.createElement('style')
		layoutStyle.textContent = `
			.page-clip {
				width: ${width}px;
				height: ${height}px;
				overflow: hidden;
			}
			.page-content {
				height: ${height}px;
				column-width: ${width}px;
				column-fill: auto;
				column-gap: 0;
				will-change: transform;
				transition: transform 200ms ease;
			}
			.page-content * {
				max-width: ${width}px;
				box-sizing: border-box;
			}
			img, figure, svg, table {
				break-inside: avoid;
				max-width: ${width}px !important;
				max-height: ${height}px !important;
				object-fit: contain;
			}
		`
		shadow.appendChild(layoutStyle)

		const clip = document.createElement('div')
		clip.className = 'page-clip'
		shadow.appendChild(clip)

		const content = document.createElement('div')
		content.className = 'page-content'
		content.innerHTML = bundle.html
		clip.appendChild(content)
		contentRef.current = content

		for (const a of Array.from(content.querySelectorAll('a'))) {
			if (a.getAttribute('epub:type') === 'pagebreak')
				a.replaceWith(...Array.from(a.childNodes))
		}

		for (const img of Array.from(content.querySelectorAll('img'))) {
			const parent = img.parentElement
			if (parent instanceof HTMLElement && parent !== content) {
				parent.style.overflow = 'hidden'
				parent.style.maxHeight = `${height}px`
			}
		}

		const handleClick = (e: Event) => {
			const target = (e.target as Element).closest('a')
			if (!target) return
			const href = target.getAttribute('href')
			if (!href) return
			e.preventDefault()
			if (href.startsWith('http://') || href.startsWith('https://'))
				void window.electronAPI.native.openExternal(href)
		}
		shadow.addEventListener('click', handleClick)

		const rafId = requestAnimationFrame(() => {
			const el = contentRef.current
			if (!el || width === 0) return
			const pages = Math.max(1, Math.round(el.scrollWidth / width))
			onPageCountReadyRef.current(pages)
		})

		return () => {
			shadow.removeEventListener('click', handleClick)
			cancelAnimationFrame(rafId)
		}
	}, [bundle, containerSize])

	useEffect(() => {
		const content = contentRef.current
		if (!content) return
		content.style.transform = `translateX(${-pageIndex * layoutWidthRef.current}px)`
	}, [pageIndex])

	return <div ref={hostRef} className="w-full h-full" />
}
