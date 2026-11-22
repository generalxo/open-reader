import type { TocEntry } from '../../../reader/toc'

interface TocPanelProps {
	entries: TocEntry[] | null
	currentHref: string | null
	onSelect: (entry: TocEntry) => void
	onClose: () => void
}

function TocList({ entries, currentHref, onSelect, depth }: Omit<TocPanelProps, 'onClose'> & { entries: TocEntry[]; depth: number }) {
	return (
		<ul className="flex flex-col">
			{entries.map((entry, index) => {
				const isCurrent = entry.href !== null && entry.href === currentHref

				return (
					<li key={`${entry.href ?? 'heading'}#${entry.fragment ?? ''}-${index}`}>
						{entry.href ? (
							<button
								onClick={() => onSelect(entry)}
								aria-current={isCurrent ? 'location' : undefined}
								className={`w-full text-left text-sm py-1.5 pr-3 rounded transition-colors cursor-pointer hover:bg-[var(--color-surface-2)] ${
									isCurrent ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'
								}`}
								style={{ paddingLeft: 12 + depth * 14 }}
							>
								{entry.label || 'Untitled'}
							</button>
						) : (
							<span className="block text-sm py-1.5 text-[var(--color-text-muted)]" style={{ paddingLeft: 12 + depth * 14 }}>
								{entry.label}
							</span>
						)}

						{entry.children.length > 0 && (
							<TocList entries={entry.children} currentHref={currentHref} onSelect={onSelect} depth={depth + 1} />
						)}
					</li>
				)
			})}
		</ul>
	)
}

// Drawer over the reading area. Clicking the backdrop closes it.
export default function TocPanel({ entries, currentHref, onSelect, onClose }: TocPanelProps) {
	return (
		<div className="absolute inset-0 z-20 flex">
			<nav
				aria-label="Table of contents"
				className="w-80 max-w-[85%] h-full overflow-y-auto py-3 border-r border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg"
			>
				<h2 className="px-3 pb-2 text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Contents</h2>
				{entries === null && <p className="px-3 text-sm text-[var(--color-text-muted)]">Loading…</p>}
				{entries?.length === 0 && <p className="px-3 text-sm text-[var(--color-text-muted)]">This book has no table of contents.</p>}
				{entries && entries.length > 0 && <TocList entries={entries} currentHref={currentHref} onSelect={onSelect} depth={0} />}
			</nav>
			<button aria-label="Close table of contents" onClick={onClose} className="flex-1 bg-black/30 cursor-default" />
		</div>
	)
}
