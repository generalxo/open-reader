import { useEffect, useRef } from 'react'

const READER_DEFAULTS = `
	body, div {
		font-size: 1rem;
		line-height: 1.6;
	}
	:host > div {
		max-width: 70ch;
		margin: 0 auto;
		padding: 0 1.5rem;
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

interface ReaderViewProps {
	html: string
	styles: string[]
	themeStyles: string
}

export default function ReaderView({ html, styles, themeStyles }: ReaderViewProps) {
	const hostRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const host = hostRef.current
		if (!host) return

		const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
		shadow.replaceChildren()

		for (const css of styles) {
			const style = document.createElement('style')
			style.textContent = css
			shadow.appendChild(style)
		}

		const defaults = document.createElement('style')
		defaults.textContent = READER_DEFAULTS
		shadow.appendChild(defaults)

		const content = document.createElement('div')
		content.innerHTML = html
		shadow.appendChild(content)

		if (themeStyles) {
			const theme = document.createElement('style')
			theme.textContent = themeStyles
			shadow.appendChild(theme)
		}

		const handleClick = (e: MouseEvent) => {
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
	}, [html, styles, themeStyles])

	return <div ref={hostRef} className="w-full h-full overflow-auto" />
}
