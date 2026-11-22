import { serializeLocator } from './locator'
import type { Locator } from './types'

const SAVE_DELAY_MS = 1000

export interface ProgressSaver {
	update(locator: Locator): void // remember the latest position; saved within the delay
	flush(): void                  // save the latest position now (unmount, window close)
}

// Saves at most once per delay while the reader keeps turning pages, always ending with the
// latest position, and skips positions identical to the last one saved (relayouts re-emit them).
export function createProgressSaver(save: (locator: Locator) => Promise<unknown>, delayMs = SAVE_DELAY_MS): ProgressSaver {
	let pending: Locator | null = null
	let lastSaved: string | null = null
	let timer: ReturnType<typeof setTimeout> | null = null

	function flush() {
		if (timer !== null) {
			clearTimeout(timer)
			timer = null
		}

		if (!pending)
			return

		const locator = pending
		const key = serializeLocator(locator)
		pending = null
		if (key === lastSaved)
			return

		lastSaved = key
		// A failed save is retried with the next update rather than dropped for good
		save(locator).catch(() => {
			if (lastSaved === key)
				lastSaved = null
		})
	}

	return {
		update(locator) {
			pending = locator
			if (timer === null)
				timer = setTimeout(flush, delayMs)
		},
		flush,
	}
}

// reading_progress.percentage is 0..100, rounded to 2 decimals
export function toPercentage(locator: Locator): number {
	return Math.round(locator.totalProgression * 10000) / 100
}
