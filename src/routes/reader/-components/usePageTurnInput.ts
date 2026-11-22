import { useEffect, type RefObject } from 'react'

const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' '])
const PREV_KEYS = new Set(['ArrowLeft', 'ArrowUp', 'PageUp'])

// One page per wheel gesture; a trackpad swipe fires dozens of wheel events.
const WHEEL_COOLDOWN_MS = 300

function isTypingTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement))
		return false

	return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

// Keyboard page turns anywhere in the window (the engine re-dispatches keys pressed inside the
// book on the container, so they bubble here too) and wheel page turns over the container.
// `enabled` is false while something covers the book (e.g. the contents panel).
export function usePageTurnInput(containerRef: RefObject<HTMLElement | null>, next: () => Promise<void>, prev: () => Promise<void>, enabled = true) {
	useEffect(() => {
		if (!enabled)
			return

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey || isTypingTarget(e.target))
				return

			// Space on a focused button should press the button, not turn the page
			if (e.key === ' ' && e.target instanceof HTMLButtonElement)
				return

			if (NEXT_KEYS.has(e.key)) {
				e.preventDefault()
				void next()
			} else if (PREV_KEYS.has(e.key)) {
				e.preventDefault()
				void prev()
			}
		}

		window.addEventListener('keydown', onKeyDown)

		return () => window.removeEventListener('keydown', onKeyDown)
	}, [next, prev, enabled])

	useEffect(() => {
		const container = containerRef.current
		if (!container || !enabled)
			return

		let lastWheel = 0

		const onWheel = (e: WheelEvent) => {
			e.preventDefault()
			const now = Date.now()
			if (now - lastWheel < WHEEL_COOLDOWN_MS || e.deltaY === 0)
				return

			lastWheel = now
			void (e.deltaY > 0 ? next() : prev())
		}

		container.addEventListener('wheel', onWheel, { passive: false })

		return () => container.removeEventListener('wheel', onWheel)
	}, [containerRef, next, prev, enabled])
}
