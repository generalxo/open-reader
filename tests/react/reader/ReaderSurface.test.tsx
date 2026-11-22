import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { ReaderBook, ReaderEngine, RelocateEvent } from '../../../src/reader/types'

const engine = vi.hoisted(() => {
	const listeners = new Set<(event: RelocateEvent) => void>()

	return {
		listeners,
		open: vi.fn().mockResolvedValue(undefined),
		next: vi.fn().mockResolvedValue(undefined),
		prev: vi.fn().mockResolvedValue(undefined),
		setSettings: vi.fn(),
		setFlow: vi.fn().mockResolvedValue(undefined),
		destroy: vi.fn(),
	}
})

vi.mock('../../../src/reader/iframeEngine', () => ({
	createIframeEngine: (): ReaderEngine => ({
		open: engine.open,
		goTo: vi.fn(),
		next: engine.next,
		prev: engine.prev,
		setFlow: engine.setFlow,
		setSettings: engine.setSettings,
		onRelocate: (listener) => {
			engine.listeners.add(listener)

			return () => engine.listeners.delete(listener)
		},
		destroy: engine.destroy,
	}),
}))

import ReaderSurface from '../../../src/routes/reader/-components/ReaderSurface'
import { DEFAULT_SETTINGS } from '../../../src/reader/settings'
import { createLocator, serializeLocator } from '../../../src/reader/locator'
import type { ReactElement } from 'react'

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

const progressApi = { get: vi.fn(), save: vi.fn() }

beforeEach(() => {
	engine.listeners.clear()
	vi.clearAllMocks()
	progressApi.get.mockResolvedValue(null)
	progressApi.save.mockResolvedValue(undefined)
	vi.stubGlobal('electronAPI', { progress: progressApi, native: { openExternal: vi.fn() } })
})

// The engine only opens once the saved position has loaded
async function renderSurface(ui: ReactElement = <ReaderSurface book={book} settings={DEFAULT_SETTINGS} />) {
	const result = render(ui)
	await waitFor(() => expect(engine.open).toHaveBeenCalled())

	return result
}

describe('ReaderSurface', () => {
	it('opens the book at the start when nothing is saved, and destroys the engine on unmount', async () => {
		const { unmount } = await renderSurface()

		expect(engine.open).toHaveBeenLastCalledWith(book, undefined)
		unmount()
		expect(engine.destroy).toHaveBeenCalled()
	})

	it('opens at the saved position and saves new positions on unmount', async () => {
		const saved = createLocator(book.spine, 0, 0.5)
		progressApi.get.mockResolvedValue({ id: 1, bookId: 1, percentage: 50, position: serializeLocator(saved), lastReadAt: 0 })
		const { unmount } = await renderSurface()

		expect(engine.open).toHaveBeenLastCalledWith(book, saved)

		const moved = createLocator(book.spine, 0, 0.75)
		relocate({ locator: moved })
		unmount()

		expect(progressApi.save).toHaveBeenLastCalledWith(1, 75, serializeLocator(moved))
	})

	it('applies settings before opening and pushes changes without recreating the engine', async () => {
		const { rerender } = await renderSurface()

		expect(engine.setSettings).toHaveBeenCalledWith(DEFAULT_SETTINGS)
		expect(engine.setSettings.mock.invocationCallOrder[0]).toBeLessThan(engine.open.mock.invocationCallOrder[0])

		const bigger = { ...DEFAULT_SETTINGS, fontScale: 130 }
		rerender(<ReaderSurface book={book} settings={bigger} />)

		expect(engine.setSettings).toHaveBeenLastCalledWith(bigger)
		expect(engine.destroy).not.toHaveBeenCalled()
	})

	it('sets the flow before opening and switches it without recreating the engine', async () => {
		const { rerender } = await renderSurface(<ReaderSurface book={book} settings={{ ...DEFAULT_SETTINGS, flow: 'scrolled' }} />)

		expect(engine.setFlow).toHaveBeenCalledWith('scrolled')
		expect(engine.setFlow.mock.invocationCallOrder[0]).toBeLessThan(engine.open.mock.invocationCallOrder[0])

		rerender(<ReaderSurface book={book} settings={{ ...DEFAULT_SETTINGS, flow: 'paginated' }} />)

		expect(engine.setFlow).toHaveBeenLastCalledWith('paginated')
		expect(engine.destroy).not.toHaveBeenCalled()
	})

	it('shows overall book progress instead of pages in scrolled flow', async () => {
		await renderSurface()
		relocate({ page: null, locator: { ...createLocator(book.spine, 0, 0.42) } })

		expect(screen.getByText('42%')).toBeInTheDocument()
	})

	it('does not turn the page when Space presses a focused button', async () => {
		await renderSurface()
		relocate({})

		fireEvent.keyDown(screen.getByLabelText('Next page'), { key: ' ' })

		expect(engine.next).not.toHaveBeenCalled()
	})

	it('shows the page indicator and arrow state from relocate events', async () => {
		await renderSurface()
		relocate({ atStart: true, atEnd: false, page: { index: 2, count: 9 } })

		expect(screen.getByText('3 / 9')).toBeInTheDocument()
		expect(screen.getByLabelText('Previous page')).toBeDisabled()
		expect(screen.getByLabelText('Next page')).toBeEnabled()
	})

	it('turns pages with the arrow buttons', async () => {
		await renderSurface()
		relocate({})

		fireEvent.click(screen.getByLabelText('Next page'))
		fireEvent.click(screen.getByLabelText('Previous page'))

		expect(engine.next).toHaveBeenCalledTimes(1)
		expect(engine.prev).toHaveBeenCalledTimes(1)
	})

	it('turns pages with the keyboard, but not while typing', async () => {
		await renderSurface(<><ReaderSurface book={book} settings={DEFAULT_SETTINGS} /><input aria-label="search" /></>)

		fireEvent.keyDown(window, { key: 'ArrowRight' })
		fireEvent.keyDown(window, { key: 'PageUp' })
		fireEvent.keyDown(screen.getByLabelText('search'), { key: 'ArrowRight' })
		fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true })

		expect(engine.next).toHaveBeenCalledTimes(1)
		expect(engine.prev).toHaveBeenCalledTimes(1)
	})

	it('turns one page per wheel gesture', async () => {
		await renderSurface()
		const surface = screen.getByTestId('reader-surface')

		fireEvent.wheel(surface, { deltaY: 40 })
		fireEvent.wheel(surface, { deltaY: 40 })

		expect(engine.next).toHaveBeenCalledTimes(1)
	})
})
