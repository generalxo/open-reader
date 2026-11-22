import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import type { ReaderBook, ReaderEngine, RelocateEvent } from '../../../src/reader/types'

const engine = vi.hoisted(() => {
	const listeners = new Set<(event: RelocateEvent) => void>()

	return {
		listeners,
		open: vi.fn().mockResolvedValue(undefined),
		next: vi.fn().mockResolvedValue(undefined),
		prev: vi.fn().mockResolvedValue(undefined),
		destroy: vi.fn(),
	}
})

vi.mock('../../../src/reader/iframeEngine', () => ({
	createIframeEngine: (): ReaderEngine => ({
		open: engine.open,
		goTo: vi.fn(),
		next: engine.next,
		prev: engine.prev,
		setFlow: vi.fn(),
		onRelocate: (listener) => {
			engine.listeners.add(listener)

			return () => engine.listeners.delete(listener)
		},
		destroy: engine.destroy,
	}),
}))

import ReaderSurface from '../../../src/routes/reader/-components/ReaderSurface'

const book: ReaderBook = { id: 1, spine: [{ id: 'ch1', href: 'OEBPS/ch1.xhtml', size: 100 }] }

function relocate(event: Partial<RelocateEvent>) {
	act(() => {
		for (const listener of engine.listeners)
			listener({
				locator: { spineIndex: 0, href: 'OEBPS/ch1.xhtml', progression: 0, totalProgression: 0 },
				atStart: false,
				atEnd: false,
				page: { index: 0, count: 1 },
				...event,
			})
	})
}

beforeEach(() => {
	engine.listeners.clear()
	vi.clearAllMocks()
})

describe('ReaderSurface', () => {
	it('opens the book in the engine and destroys it on unmount', () => {
		const { unmount } = render(<ReaderSurface book={book} />)

		expect(engine.open).toHaveBeenLastCalledWith(book)
		unmount()
		expect(engine.destroy).toHaveBeenCalled()
	})

	it('shows the page indicator and arrow state from relocate events', () => {
		render(<ReaderSurface book={book} />)
		relocate({ atStart: true, atEnd: false, page: { index: 2, count: 9 } })

		expect(screen.getByText('3 / 9')).toBeInTheDocument()
		expect(screen.getByLabelText('Previous page')).toBeDisabled()
		expect(screen.getByLabelText('Next page')).toBeEnabled()
	})

	it('turns pages with the arrow buttons', () => {
		render(<ReaderSurface book={book} />)
		relocate({})

		fireEvent.click(screen.getByLabelText('Next page'))
		fireEvent.click(screen.getByLabelText('Previous page'))

		expect(engine.next).toHaveBeenCalledTimes(1)
		expect(engine.prev).toHaveBeenCalledTimes(1)
	})

	it('turns pages with the keyboard, but not while typing', () => {
		render(<><ReaderSurface book={book} /><input aria-label="search" /></>)

		fireEvent.keyDown(window, { key: 'ArrowRight' })
		fireEvent.keyDown(window, { key: 'PageUp' })
		fireEvent.keyDown(screen.getByLabelText('search'), { key: 'ArrowRight' })
		fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true })

		expect(engine.next).toHaveBeenCalledTimes(1)
		expect(engine.prev).toHaveBeenCalledTimes(1)
	})

	it('turns one page per wheel gesture', () => {
		render(<ReaderSurface book={book} />)
		const surface = screen.getByTestId('reader-surface')

		fireEvent.wheel(surface, { deltaY: 40 })
		fireEvent.wheel(surface, { deltaY: 40 })

		expect(engine.next).toHaveBeenCalledTimes(1)
	})
})
