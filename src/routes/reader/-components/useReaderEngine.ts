import { useCallback, useEffect, useRef, useState } from 'react'
import { createIframeEngine } from '../../../reader/iframeEngine'
import type { ReaderBook, ReaderEngine, RelocateEvent } from '../../../reader/types'

function openExternal(url: string) {
	void window.electronAPI.native.openExternal(url)
}

// Owns one engine per book: created on mount, destroyed on unmount or when the book changes.
export function useReaderEngine(book: ReaderBook) {
	const containerRef = useRef<HTMLDivElement>(null)
	const engineRef = useRef<ReaderEngine | null>(null)
	const [relocation, setRelocation] = useState<RelocateEvent | null>(null)

	useEffect(() => {
		const container = containerRef.current
		if (!container)
			return

		const engine = createIframeEngine(container, { onExternalLink: openExternal })
		const unsubscribe = engine.onRelocate(setRelocation)
		engineRef.current = engine
		void engine.open(book)

		return () => {
			unsubscribe()
			engine.destroy()
			engineRef.current = null
		}
	}, [book])

	const next = useCallback(() => engineRef.current?.next() ?? Promise.resolve(), [])
	const prev = useCallback(() => engineRef.current?.prev() ?? Promise.resolve(), [])

	return { containerRef, relocation, next, prev }
}
