import { useCallback, useEffect, useRef, useState } from 'react'
import { parseLocator, serializeLocator } from '../../../reader/locator'
import { createProgressSaver, toPercentage, type ProgressSaver } from '../../../reader/progressSaver'
import type { Locator, ReaderBook } from '../../../reader/types'

interface Restored {
	bookId: number
	start: Locator | null // null = no (usable) saved position, start at the beginning
}

// Loads the saved position for a book and saves new positions as the reader moves.
// `ready` stays false until the saved position is known, so the engine opens in the right place
// instead of flashing the first page.
export function useReadingProgress(book: ReaderBook) {
	const [restored, setRestored] = useState<Restored | null>(null)
	const saverRef = useRef<ProgressSaver | null>(null)

	useEffect(() => {
		let cancelled = false

		void window.electronAPI.progress.get(book.id)
			.then((progress) => parseLocator(progress?.position, book.spine))
			.catch(() => null)
			.then((start) => {
				if (!cancelled)
					setRestored({ bookId: book.id, start })
			})

		return () => {
			cancelled = true
		}
	}, [book])

	useEffect(() => {
		const saver = createProgressSaver((locator) =>
			window.electronAPI.progress.save(book.id, toPercentage(locator), serializeLocator(locator)),
		)
		const onUnload = () => saver.flush()
		saverRef.current = saver
		window.addEventListener('beforeunload', onUnload)

		return () => {
			window.removeEventListener('beforeunload', onUnload)
			saver.flush()
			saverRef.current = null
		}
	}, [book.id])

	const record = useCallback((locator: Locator) => saverRef.current?.update(locator), [])

	const current = restored?.bookId === book.id ? restored : null

	return { ready: current !== null, start: current?.start ?? null, record }
}
