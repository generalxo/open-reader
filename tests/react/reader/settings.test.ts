import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, parseSettings, settingsCss, stepFontScale } from '../../../src/reader/settings'

describe('parseSettings', () => {
	it('returns defaults for missing or unreadable data', () => {
		expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
		expect(parseSettings('{oops')).toEqual(DEFAULT_SETTINGS)
		expect(parseSettings('42')).toEqual(DEFAULT_SETTINGS)
	})

	it('keeps valid values and clamps out-of-range ones', () => {
		expect(parseSettings(JSON.stringify({ fontScale: 130, lineHeight: 1.8, pageWidth: 900, theme: 'sepia' })))
			.toEqual({ fontScale: 130, lineHeight: 1.8, pageWidth: 900, theme: 'sepia' })
		expect(parseSettings(JSON.stringify({ fontScale: 999, lineHeight: 9, pageWidth: 10 })))
			.toEqual({ fontScale: 200, lineHeight: 3, pageWidth: 400, theme: 'dark' })
	})

	it('falls back per field for wrong types and unknown themes', () => {
		expect(parseSettings(JSON.stringify({ fontScale: '120', lineHeight: 'x', theme: 'neon' })))
			.toEqual(DEFAULT_SETTINGS)
	})
})

describe('stepFontScale', () => {
	it('steps by 10 within 70..200', () => {
		expect(stepFontScale(100, 1)).toBe(110)
		expect(stepFontScale(70, -1)).toBe(70)
		expect(stepFontScale(200, 1)).toBe(200)
	})
})

describe('settingsCss', () => {
	it('leaves the book typography alone at the defaults', () => {
		const css = settingsCss({ ...DEFAULT_SETTINGS, theme: 'light' })

		expect(css).not.toContain('font-size')
		expect(css).not.toContain('line-height')
		expect(css).not.toContain('!important; background-color')
	})

	it('overrides font size and line height when set', () => {
		const css = settingsCss({ ...DEFAULT_SETTINGS, fontScale: 140, lineHeight: 1.8 })

		expect(css).toContain('font-size: 140% !important')
		expect(css).toContain('line-height: 1.8 !important')
	})

	it('forces readable colours on the dark theme only', () => {
		expect(settingsCss({ ...DEFAULT_SETTINGS, theme: 'dark' })).toContain('body, body * { color: #e8e8e8 !important')
		expect(settingsCss({ ...DEFAULT_SETTINGS, theme: 'sepia' })).not.toContain('body, body *')
		expect(settingsCss({ ...DEFAULT_SETTINGS, theme: 'sepia' })).toContain('background: #f4ecd8 !important')
	})
})
