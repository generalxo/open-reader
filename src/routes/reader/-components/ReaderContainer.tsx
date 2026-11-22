import { useState, useEffect, useMemo } from 'react'
import { THEMES } from '../../../reader/settings'
import type { ReadingFlow } from '../../../reader/types'
import type { Book } from '../../../types/models/book'
import type { SpineItem } from '../../../types/models/spineItem'
import type { ReadingMode } from '../../../types/models/readingMode'
import PagedReader from './PagedReader'
import ScrollableReader from './ScrollableReader'
import ReaderSurface from './ReaderSurface'
import ReaderSettingsPanel from './ReaderSettingsPanel'
import { useReaderSettings } from './useReaderSettings'

// 'engine' is the new iframe reader, shown next to the old modes until it replaces them.
// Its two buttons share one reader instance and only switch its flow, so the position carries over.
type ReaderChoice = ReadingMode | 'engine'

const MODES: { mode: ReaderChoice; flow?: ReadingFlow; label: string }[] = [
	{ mode: 'scroll', label: 'Scroll' },
	{ mode: 'page', label: 'Pages' },
	{ mode: 'engine', flow: 'paginated', label: 'Pages (new)' },
	{ mode: 'engine', flow: 'scrolled', label: 'Scroll (new)' },
]

const TOGGLE_CLASS = 'text-xs px-3 py-1 rounded border transition-colors'
const TOGGLE_ACTIVE_CLASS = 'text-indigo-300 border-indigo-500 bg-[#1e1e2e]'
const TOGGLE_INACTIVE_CLASS = 'text-[#555] border-[#333] bg-[#1e1e2e]'

interface ReaderContainerProps {
	book: Book
}

export default function ReaderContainer({ book }: ReaderContainerProps) {
	const [spine, setSpine] = useState<SpineItem[]>([])
	const [mode, setMode] = useState<ReaderChoice>('scroll')
	const [settingsOpen, setSettingsOpen] = useState(false)
	const { settings, updateSettings } = useReaderSettings()

	useEffect(() => {
		void (async () => {
			setSpine(await window.electronAPI.reader.getSpine(book.path))
		})()
	}, [book.path])

	// Stable identity, so the engine is only recreated when the book actually changes
	const readerBook = useMemo(() => ({ id: book.id, spine }), [book.id, spine])

	if (spine.length === 0)
		return null

	const isEngine = mode === 'engine'

	return (
		<div className="flex flex-col h-full">
			<div className="relative flex items-center justify-end gap-2 px-4 h-10 bg-[#13131f] border-b border-[#222] shrink-0">
				{MODES.map(({ mode: option, flow, label }) => {
					const active = mode === option && (!flow || flow === settings.flow)

					return (
						<button
							key={label}
							onClick={() => {
								setMode(option)
								if (flow)
									updateSettings({ flow })
							}}
							className={`${TOGGLE_CLASS} ${active ? TOGGLE_ACTIVE_CLASS : TOGGLE_INACTIVE_CLASS}`}
						>
							{label}
						</button>
					)
				})}

				{isEngine && (
					<button
						onClick={() => setSettingsOpen((open) => !open)}
						aria-label="Reader settings"
						aria-expanded={settingsOpen}
						className={`${TOGGLE_CLASS} ${settingsOpen ? TOGGLE_ACTIVE_CLASS : TOGGLE_INACTIVE_CLASS}`}
					>
						Aa
					</button>
				)}

				{isEngine && settingsOpen && (
					<div className="absolute right-4 top-11 z-20">
						<ReaderSettingsPanel settings={settings} onChange={updateSettings} />
					</div>
				)}
			</div>

			<div
				className="flex-1 overflow-hidden flex justify-center"
				style={isEngine ? { backgroundColor: THEMES[settings.theme].background } : undefined}
			>
				<div
					className="w-full max-w-[700px] h-full overflow-hidden"
					style={isEngine ? { maxWidth: settings.pageWidth } : undefined}
				>
					{mode === 'scroll' && <ScrollableReader bookPath={book.path} spine={spine} />}
					{mode === 'page' && <PagedReader bookPath={book.path} spine={spine} />}
					{isEngine && <ReaderSurface book={readerBook} settings={settings} />}
				</div>
			</div>
		</div>
	)
}
