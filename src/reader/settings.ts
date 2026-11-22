// User-facing reader settings and the CSS they turn into inside the chapter iframe.

export type ThemeId = 'dark' | 'sepia' | 'light'

export interface ReaderSettings {
	fontScale: number         // percent of the book's own font sizes; 100 = as the book sets them
	lineHeight: number | null // null = as the book sets it
	pageWidth: number         // px, max width of the reading column
	theme: ThemeId
}

interface Theme {
	label: string
	scheme: 'dark' | 'light'
	background: string
	text: string
	link: string
	// Books are designed for white paper, so on dark backgrounds their own text colours
	// (often #000) are replaced. Light themes keep the book's colours.
	forceColors: boolean
}

export const THEMES: Record<ThemeId, Theme> = {
	dark: { label: 'Dark', scheme: 'dark', background: '#0f0f0f', text: '#e8e8e8', link: '#c87941', forceColors: true },
	sepia: { label: 'Sepia', scheme: 'light', background: '#f4ecd8', text: '#5b4636', link: '#8a4b1f', forceColors: false },
	light: { label: 'Light', scheme: 'light', background: '#ffffff', text: '#1a1a1a', link: '#1a4fb8', forceColors: false },
}

export const FONT_SCALE = { min: 70, max: 200, step: 10 }
export const LINE_HEIGHTS = [1.2, 1.4, 1.6, 1.8, 2.0]
export const PAGE_WIDTHS = [{ label: 'Narrow', value: 560 }, { label: 'Medium', value: 700 }, { label: 'Wide', value: 900 }]

export const DEFAULT_SETTINGS: ReaderSettings = {
	fontScale: 100,
	lineHeight: null,
	pageWidth: 700,
	theme: 'dark',
}

const PAGE_WIDTH_RANGE = { min: 400, max: 1600 }

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value))
}

function isThemeId(value: unknown): value is ThemeId {
	return typeof value === 'string' && value in THEMES
}

// Reads stored settings back, falling back to the default for anything missing or invalid.
export function parseSettings(raw: string | null): ReaderSettings {
	if (!raw)
		return DEFAULT_SETTINGS

	let data: unknown
	try {
		data = JSON.parse(raw)
	} catch {
		return DEFAULT_SETTINGS
	}

	if (typeof data !== 'object' || data === null)
		return DEFAULT_SETTINGS

	const { fontScale, lineHeight, pageWidth, theme } = data as Record<string, unknown>
	const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

	return {
		fontScale: isNumber(fontScale) ? clamp(Math.round(fontScale), FONT_SCALE.min, FONT_SCALE.max) : DEFAULT_SETTINGS.fontScale,
		lineHeight: isNumber(lineHeight) ? clamp(lineHeight, 1, 3) : null,
		pageWidth: isNumber(pageWidth) ? clamp(Math.round(pageWidth), PAGE_WIDTH_RANGE.min, PAGE_WIDTH_RANGE.max) : DEFAULT_SETTINGS.pageWidth,
		theme: isThemeId(theme) ? theme : DEFAULT_SETTINGS.theme,
	}
}

export function stepFontScale(fontScale: number, direction: 1 | -1): number {
	return clamp(fontScale + direction * FONT_SCALE.step, FONT_SCALE.min, FONT_SCALE.max)
}

// Rules only override the book where the user changed something, so the defaults leave
// the book's own typography untouched.
export function settingsCss(settings: ReaderSettings): string {
	const theme = THEMES[settings.theme]
	const rules = [
		`html { color-scheme: ${theme.scheme}; background: ${theme.background} !important; color: ${theme.text}; }`,
		`a:link, a:visited { color: ${theme.link}; }`,
	]

	if (settings.fontScale !== 100)
		rules.push(`html { font-size: ${settings.fontScale}% !important; }`)

	if (settings.lineHeight !== null)
		rules.push(`body, p, li, blockquote, dd, dt, td, th, div, span { line-height: ${settings.lineHeight} !important; }`)

	if (theme.forceColors) {
		rules.push(`body, body * { color: ${theme.text} !important; background-color: transparent !important; }`)
		rules.push(`a:link, a:visited, a:link *, a:visited * { color: ${theme.link} !important; }`)
	}

	return rules.join('\n')
}
