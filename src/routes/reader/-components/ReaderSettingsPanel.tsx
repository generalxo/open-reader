import type { ReactNode } from 'react'
import { FONT_SCALE, LINE_HEIGHTS, PAGE_WIDTHS, stepFontScale, THEMES, type ReaderSettings, type ThemeId } from '../../../reader/settings'

const OPTION_CLASS = 'text-xs px-2 py-1 rounded border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default'
const ACTIVE_CLASS = 'text-indigo-300 border-indigo-500 bg-[#1e1e2e]'
const INACTIVE_CLASS = 'text-[var(--color-text-muted)] border-[var(--color-border)] bg-[var(--color-surface-2)]'

function optionClass(active: boolean): string {
	return `${OPTION_CLASS} ${active ? ACTIVE_CLASS : INACTIVE_CLASS}`
}

interface ReaderSettingsPanelProps {
	settings: ReaderSettings
	onChange: (change: Partial<ReaderSettings>) => void
}

function Row({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-4">
			<span className="text-xs text-[var(--color-text-muted)]">{label}</span>
			<div className="flex items-center gap-1">{children}</div>
		</div>
	)
}

export default function ReaderSettingsPanel({ settings, onChange }: ReaderSettingsPanelProps) {
	const { fontScale, lineHeight, pageWidth, theme } = settings

	return (
		<div
			role="dialog"
			aria-label="Reader settings"
			className="flex flex-col gap-3 w-80 p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg"
		>
			<Row label="Font size">
				<button
					className={optionClass(false)}
					onClick={() => onChange({ fontScale: stepFontScale(fontScale, -1) })}
					disabled={fontScale <= FONT_SCALE.min}
					aria-label="Smaller text"
				>
					A−
				</button>
				<button className={optionClass(fontScale === 100)} onClick={() => onChange({ fontScale: 100 })} aria-label="Reset text size">
					{fontScale}%
				</button>
				<button
					className={optionClass(false)}
					onClick={() => onChange({ fontScale: stepFontScale(fontScale, 1) })}
					disabled={fontScale >= FONT_SCALE.max}
					aria-label="Larger text"
				>
					A+
				</button>
			</Row>

			<Row label="Line height">
				<button className={optionClass(lineHeight === null)} onClick={() => onChange({ lineHeight: null })}>
					Book
				</button>
				{LINE_HEIGHTS.map((value) => (
					<button key={value} className={optionClass(lineHeight === value)} onClick={() => onChange({ lineHeight: value })}>
						{value.toFixed(1)}
					</button>
				))}
			</Row>

			<Row label="Width">
				{PAGE_WIDTHS.map(({ label, value }) => (
					<button key={value} className={optionClass(pageWidth === value)} onClick={() => onChange({ pageWidth: value })}>
						{label}
					</button>
				))}
			</Row>

			<Row label="Theme">
				{(Object.keys(THEMES) as ThemeId[]).map((id) => (
					<button key={id} className={optionClass(theme === id)} onClick={() => onChange({ theme: id })}>
						{THEMES[id].label}
					</button>
				))}
			</Row>
		</div>
	)
}
