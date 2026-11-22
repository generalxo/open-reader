import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import ReaderSettingsPanel from '../../../src/routes/reader/-components/ReaderSettingsPanel'
import { useReaderSettings } from '../../../src/routes/reader/-components/useReaderSettings'
import { DEFAULT_SETTINGS } from '../../../src/reader/settings'

describe('ReaderSettingsPanel', () => {
	it('reports changes for each control', () => {
		const onChange = vi.fn()
		render(<ReaderSettingsPanel settings={DEFAULT_SETTINGS} onChange={onChange} />)

		fireEvent.click(screen.getByLabelText('Larger text'))
		fireEvent.click(screen.getByText('1.8'))
		fireEvent.click(screen.getByText('Wide'))
		fireEvent.click(screen.getByText('Sepia'))

		expect(onChange.mock.calls).toEqual([
			[{ fontScale: 110 }],
			[{ lineHeight: 1.8 }],
			[{ pageWidth: 900 }],
			[{ theme: 'sepia' }],
		])
	})

	it('disables font size buttons at the limits', () => {
		render(<ReaderSettingsPanel settings={{ ...DEFAULT_SETTINGS, fontScale: 200 }} onChange={vi.fn()} />)

		expect(screen.getByLabelText('Larger text')).toBeDisabled()
		expect(screen.getByLabelText('Smaller text')).toBeEnabled()
	})
})

describe('useReaderSettings', () => {
	beforeEach(() => {
		localStorage.clear()
	})

	it('persists changes and restores them on the next mount', () => {
		const first = renderHook(() => useReaderSettings())
		act(() => first.result.current.updateSettings({ theme: 'light', fontScale: 120 }))

		const second = renderHook(() => useReaderSettings())

		expect(second.result.current.settings).toEqual({ ...DEFAULT_SETTINGS, theme: 'light', fontScale: 120 })
	})
})
