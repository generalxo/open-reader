import type { Book } from './types/models/book'
import type { SpineItem } from './types/models/spineItem'
import type { ChapterBundle } from './types/models/chapterBundle'
import type { ReadingProgress } from './types/models/readingProgress'

declare global {
	interface Window {
		electronAPI: {
			test: {
				sayHello: () => Promise<unknown>
			}
			zip: {
				getRootFileData: (bookpath: string) => Promise<string | null>
				getBookCoverPath: (bookpath: string) => Promise<string | null>
				getBookCoverImage: (bookPath: string, coverPath: string) => Promise<string | null>
				readEntry: (entryName: string, bookPath: string) => Promise<string>
				zipTest: (bookPath: string) => Promise<string[]>
			}
			books: {
				pickAndAdd: () => Promise<{ success: boolean; book?: Book; error?: string }>
				list: () => Promise<Book[]>
				get: (id: number) => Promise<Book | null>
				remove: (id: number) => Promise<void>
			}
			progress: {
				save: (bookId: number, percentage: number, position: string) => Promise<void>
				get: (bookId: number) => Promise<ReadingProgress | null>
			}
			native: {
				filePicker: (pickFolder?: boolean) => Promise<{ cancelled: true } | { cancelled: false; filePaths: string[] } | { error: string }>
				openExternal: (url: string) => Promise<void>
			}
			reader: {
				getSpine: (bookPath: string) => Promise<SpineItem[]>
				getChapterBundle: (bookPath: string, chapterHref: string) => Promise<ChapterBundle>
			}
		}
	}
}
