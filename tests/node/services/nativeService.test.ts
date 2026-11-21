import { vi, beforeEach, describe, expect, it } from 'vitest'

const mockOpenExternal = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('electron', () => ({
	dialog: { showOpenDialog: vi.fn() },
	shell: { openExternal: mockOpenExternal },
}))

import { isSafeExternalUrl, openExternal } from '../../../src/electron/services/nativeService'

describe('isSafeExternalUrl', () => {
	it('allows http and https links', () => {
		expect(isSafeExternalUrl('http://example.com')).toBe(true)
		expect(isSafeExternalUrl('https://example.com/a?b=c#d')).toBe(true)
	})

	it('rejects other protocols', () => {
		expect(isSafeExternalUrl('file:///C:/Windows/System32/calc.exe')).toBe(false)
		expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false)
		expect(isSafeExternalUrl('ms-settings:privacy')).toBe(false)
		expect(isSafeExternalUrl('smb://host/share')).toBe(false)
	})

	it('rejects relative and malformed urls', () => {
		expect(isSafeExternalUrl('chapter2.xhtml#note1')).toBe(false)
		expect(isSafeExternalUrl('')).toBe(false)
	})
})

describe('openExternal', () => {
	beforeEach(() => {
		mockOpenExternal.mockClear()
	})

	it('opens safe urls', async () => {
		await openExternal('https://example.com')

		expect(mockOpenExternal).toHaveBeenCalledWith('https://example.com')
	})

	it('ignores unsafe urls', async () => {
		await openExternal('file:///C:/Windows/System32/calc.exe')

		expect(mockOpenExternal).not.toHaveBeenCalled()
	})
})
