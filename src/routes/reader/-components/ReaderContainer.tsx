import { useState, useEffect, useMemo, useCallback } from 'react'
import { THEMES } from '../../../reader/settings'
import type { ReadingFlow } from '../../../reader/types'
import type { Book } from '../../../types/models/book'
import type { SpineItem } from '../../../types/models/spineItem'
import ReaderSurface from './ReaderSurface'
import ReaderSettingsPanel from './ReaderSettingsPanel'
import { useReaderSettings } from './useReaderSettings'
import { useToc } from './useToc'

// Both buttons drive the same reader instance and only switch its flow, so the position carries over
const FLOWS: { flow: ReadingFlow; label: string }[] = [
	{ flow: 'paginated', label: 'Pages' },
	{ flow: 'scrolled', label: 'Scroll' },
]

const TOGGLE_CLASS = 'text-xs px-3 py-1 rounded border transition-colors'
const TOGGLE_ACTIVE_CLASS = 'text-indigo-300 border-indigo-500 bg-[#1e1e2e]'
const TOGGLE_INACTIVE_CLASS = 'text-[#555] border-[#333] bg-[#1e1e2e]'

function toggleClass(active: boolean): string {
	return `${TOGGLE_CLASS} ${active ? TOGGLE_ACTIVE_CLASS : TOGGLE_INACTIVE_CLASS}`
}

interface ReaderContainerProps {
	book: Book
}

export default function ReaderContainer({ book }: ReaderContainerProps) {
	const [spine, setSpine] = useState<SpineItem[]>([])
	const [settingsOpen, setSettingsOpen] = useState(false)
	const [tocOpen, setTocOpen] = useState(false)
	const { settings, updateSettings } = useReaderSettings()
	const toc = useToc(book)
	const closeToc = useCallback(() => setTocOpen(false), [])

	useEffect(() => {
		void (async () => {
			setSpine(await window.electronAPI.reader.getSpine(book.path))
		})()
	}, [book.path])

	// Stable identity, so the engine is only recreated when the book actually changes
	const readerBook = useMemo(() => ({ id: book.id, spine }), [book.id, spine])

	if (spine.length === 0)
		return null

	return (
		<div className="flex flex-col h-full">
			<div className="relative flex items-center justify-end gap-2 px-4 h-10 bg-[#13131f] border-b border-[#222] shrink-0">
				<button
					onClick={() => setTocOpen((open) => !open)}
					aria-expanded={tocOpen}
					className={`mr-auto ${toggleClass(tocOpen)}`}
				>
					Contents
				</button>

				{FLOWS.map(({ flow, label }) => (
					<button key={flow} onClick={() => updateSettings({ flow })} className={toggleClass(settings.flow === flow)}>
						{label}
					</button>
				))}

				<button
					onClick={() => setSettingsOpen((open) => !open)}
					aria-label="Reader settings"
					aria-expanded={settingsOpen}
					className={toggleClass(settingsOpen)}
				>
					Aa
				</button>

				{settingsOpen && (
					<div className="absolute right-4 top-11 z-20">
						<ReaderSettingsPanel settings={settings} onChange={updateSettings} />
					</div>
				)}
			</div>

			<div className="flex-1 overflow-hidden flex justify-center" style={{ backgroundColor: THEMES[settings.theme].background }}>
				<div className="w-full h-full overflow-hidden" style={{ maxWidth: settings.pageWidth }}>
					<ReaderSurface book={readerBook} settings={settings} toc={toc} tocOpen={tocOpen} onTocClose={closeToc} />
				</div>
			</div>
		</div>
	)
}
