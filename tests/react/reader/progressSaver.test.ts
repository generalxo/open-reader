import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SpineItem } from '../../../src/types/models/spineItem'
import { createLocator } from '../../../src/reader/locator'
import { createProgressSaver, toPercentage } from '../../../src/reader/progressSaver'

const spine: SpineItem[] = [
	{ id: 'a', href: 'a.xhtml', size: 100 },
	{ id: 'b', href: 'b.xhtml', size: 100 },
]

beforeEach(() => {
	vi.useFakeTimers()
})

afterEach(() => {
	vi.useRealTimers()
})

describe('createProgressSaver', () => {
	it('saves the latest position once per delay while pages keep turning', () => {
		const save = vi.fn().mockResolvedValue(undefined)
		const saver = createProgressSaver(save, 1000)

		saver.update(createLocator(spine, 0, 0.1))
		saver.update(createLocator(spine, 0, 0.2))
		expect(save).not.toHaveBeenCalled()

		vi.advanceTimersByTime(1000)
		expect(save).toHaveBeenCalledTimes(1)
		expect(save).toHaveBeenLastCalledWith(createLocator(spine, 0, 0.2))

		saver.update(createLocator(spine, 1, 0.5))
		vi.advanceTimersByTime(1000)
		expect(save).toHaveBeenCalledTimes(2)
	})

	it('skips positions identical to the last saved one', () => {
		const save = vi.fn().mockResolvedValue(undefined)
		const saver = createProgressSaver(save, 1000)

		saver.update(createLocator(spine, 1, 0.5))
		vi.advanceTimersByTime(1000)
		saver.update(createLocator(spine, 1, 0.5))
		vi.advanceTimersByTime(1000)

		expect(save).toHaveBeenCalledTimes(1)
	})

	it('flush saves immediately and cancels the pending timer', () => {
		const save = vi.fn().mockResolvedValue(undefined)
		const saver = createProgressSaver(save, 1000)

		saver.update(createLocator(spine, 0, 0.5))
		saver.flush()
		expect(save).toHaveBeenCalledTimes(1)

		vi.advanceTimersByTime(1000)
		saver.flush()
		expect(save).toHaveBeenCalledTimes(1)
	})

	it('retries a position whose save failed', async () => {
		const save = vi.fn().mockRejectedValueOnce(new Error('db busy')).mockResolvedValue(undefined)
		const saver = createProgressSaver(save, 1000)

		saver.update(createLocator(spine, 0, 0.5))
		saver.flush()
		await vi.runAllTimersAsync()

		saver.update(createLocator(spine, 0, 0.5))
		saver.flush()

		expect(save).toHaveBeenCalledTimes(2)
	})
})

describe('toPercentage', () => {
	it('converts total progression to 0..100 with 2 decimals', () => {
		expect(toPercentage(createLocator(spine, 1, 0.5))).toBe(75)
		expect(toPercentage({ ...createLocator(spine, 0, 0), totalProgression: 0.123456 })).toBe(12.35)
	})
})
