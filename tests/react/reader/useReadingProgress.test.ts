import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useReadingProgress } from '../../../src/routes/reader/-components/useReadingProgress'
import { createLocator, serializeLocator } from '../../../src/reader/locator'
import type { ReaderBook } from '../../../src/reader/types'

const book: ReaderBook = {
	id: 7,
	spine: [
		{ id: 'a', href: 'a.xhtml', size: 100 },
		{ id: 'b', href: 'b.xhtml', size: 300 },
	],
}

const progressApi = {
	get: vi.fn(),
	save: vi.fn(),
}

beforeEach(() => {
	progressApi.get.mockReset()
	progressApi.save.mockReset().mockResolvedValue(undefined)
	vi.stubGlobal('electronAPI', { progress: progressApi })
})

afterEach(() => {
	vi.unstubAllGlobals()
})

function savedProgress(position: string | null) {
	return { id: 1, bookId: book.id, percentage: 0, position, lastReadAt: 0 }
}

describe('useReadingProgress', () => {
	it('is not ready until the saved position has loaded, then restores it', async () => {
		const saved = createLocator(book.spine, 1, 0.4)
		progressApi.get.mockResolvedValue(savedProgress(serializeLocator(saved)))

		const { result } = renderHook(() => useReadingProgress(book))
		expect(result.current.ready).toBe(false)

		await waitFor(() => expect(result.current.ready).toBe(true))
		expect(result.current.start).toEqual(saved)
		expect(progressApi.get).toHaveBeenCalledWith(7)
	})

	it('starts at the beginning when there is no usable saved position', async () => {
		progressApi.get.mockResolvedValueOnce(null)
		const first = renderHook(() => useReadingProgress(book))
		await waitFor(() => expect(first.result.current.ready).toBe(true))
		expect(first.result.current.start).toBeNull()

		progressApi.get.mockResolvedValueOnce(savedProgress('chapter-3'))
		const second = renderHook(() => useReadingProgress(book))
		await waitFor(() => expect(second.result.current.ready).toBe(true))
		expect(second.result.current.start).toBeNull()

		progressApi.get.mockRejectedValueOnce(new Error('ipc failed'))
		const third = renderHook(() => useReadingProgress(book))
		await waitFor(() => expect(third.result.current.ready).toBe(true))
		expect(third.result.current.start).toBeNull()
	})

	it('saves recorded positions as percentage + serialized locator, flushing on unmount', async () => {
		progressApi.get.mockResolvedValue(null)
		const { result, unmount } = renderHook(() => useReadingProgress(book))
		await waitFor(() => expect(result.current.ready).toBe(true))

		const locator = createLocator(book.spine, 1, 0.5)
		act(() => result.current.record(locator))
		expect(progressApi.save).not.toHaveBeenCalled()

		unmount()
		expect(progressApi.save).toHaveBeenCalledWith(7, 62.5, serializeLocator(locator))
	})
})
