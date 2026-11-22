export interface ReadingProgress {
	id: number
	bookId: number
	percentage: number      // 0..100
	position: string | null // serialized Locator (see src/reader/locator.ts)
	lastReadAt: number      // unix seconds
}
