import type { SpineItem } from '../types/models/spineItem'
import type { ReaderSettings } from './settings'

// A position in a book that survives window resizes, font changes and switching between
// paginated and scrolled flow. Page numbers can't do that, so positions are stored as the
// fraction of a chapter's content that lies before the start of the viewport.
export interface Locator {
	spineIndex: number       // chapter in reading order
	href: string             // that chapter's zip path; used to repair spineIndex if the spine changes
	progression: number      // 0..1 within the chapter
	totalProgression: number // 0..1 within the whole book, chapters weighted by size
	cfi?: string             // exact EPUB CFI, filled in once CFI support exists
}

export type ReadingFlow = 'paginated' | 'scrolled'

// Sent whenever the visible position changes (page turn, chapter load, relayout).
export interface RelocateEvent {
	locator: Locator
	atStart: boolean
	atEnd: boolean
	page: { index: number; count: number } | null // paginated flow only
}

export interface ReaderBook {
	id: number
	spine: SpineItem[]
}

// Everything that knows about EPUB documents and the DOM lives behind this interface.
// React only talks to an engine through it and only ever sees Locators.
export interface ReaderEngine {
	open(book: ReaderBook, at?: Locator): Promise<void>
	goTo(target: Locator): Promise<void>
	next(): Promise<void>
	prev(): Promise<void>
	setFlow(flow: ReadingFlow): Promise<void>
	setSettings(settings: ReaderSettings): void
	onRelocate(listener: (event: RelocateEvent) => void): () => void
	destroy(): void
}
