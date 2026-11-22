import { useCallback, useEffect, useRef, useState } from 'react'
import { createIframeEngine } from '../../../reader/iframeEngine'
import type { ReaderSettings } from '../../../reader/settings'
import type { Locator, ReaderBook, ReaderEngine, RelocateEvent } from '../../../reader/types'

function openExternal(url: string) {
	void window.electronAPI.native.openExternal(url)
}

// Owns one engine per book: created once `ready` (the start position is known), destroyed on
// unmount or when the book changes. Settings changes are pushed into the running engine.
export function useReaderEngine(book: ReaderBook, settings: ReaderSettings, start: Locator | null, ready: boolean) {
	const containerRef = useRef<HTMLDivElement>(null)
	const engineRef = useRef<ReaderEngine | null>(null)
	const settingsRef = useRef(settings)
	const [relocation, setRelocation] = useState<RelocateEvent | null>(null)

	useEffect(() => {
		const container = containerRef.current
		if (!container || !ready)
			return

		const engine = createIframeEngine(container, { onExternalLink: openExternal })
		const unsubscribe = engine.onRelocate(setRelocation)
		engineRef.current = engine
		engine.setSettings(settingsRef.current)
		void engine.setFlow(settingsRef.current.flow)
		void engine.open(book, start ?? undefined)

		return () => {
			unsubscribe()
			engine.destroy()
			engineRef.current = null
		}
	}, [book, start, ready])

	useEffect(() => {
		settingsRef.current = settings
		engineRef.current?.setSettings(settings)
	}, [settings])

	useEffect(() => {
		void engineRef.current?.setFlow(settings.flow)
	}, [settings.flow])

	const next = useCallback(() => engineRef.current?.next() ?? Promise.resolve(), [])
	const prev = useCallback(() => engineRef.current?.prev() ?? Promise.resolve(), [])

	return { containerRef, relocation, next, prev }
}
