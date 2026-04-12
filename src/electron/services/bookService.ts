import path from 'path'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '../db/index'
import { books, Book, NewBook } from '../db/schema'
import { filePicker } from './nativeService'
import { getBookCoverPath } from './zipService'

async function addBook(filePath: string): Promise<Book> {
	const db = getDb()
	const filename = path.basename(filePath)
	const coverImagePath = await getBookCoverPath(filePath)

	const [row] = await db
		.insert(books)
		.values({ path: filePath, filename, coverImagePath } satisfies NewBook)
		.onConflictDoNothing()
		.returning()

	if (!row)
		throw Object.assign(new Error('Book already exists'), { code: 'UNIQUE_VIOLATION' })

	return row
}

export async function listBooks(): Promise<Book[]> {
	return getDb().select().from(books).orderBy(desc(books.dateAdded))
}

export async function getBook(id: number): Promise<Book | null> {
	const [book] = await getDb()
		.select()
		.from(books)
		.where(eq(books.id, id))
		.limit(1)

	return book ?? null
}

export async function removeBook(id: number): Promise<void> {
	await getDb().delete(books).where(eq(books.id, id))
}

export async function pickAndAddBook(): Promise<{ success: boolean; book?: Book; error?: string }> {
	try {
		const result = await filePicker(false)
		if ('error' in result)
			return { success: false, error: 'Operation failed' }
		if (result.cancelled)
			return { success: false, error: 'cancelled' }

		const book = await addBook(result.filePaths[0])
		return { success: true, book }
	} catch (err: unknown) {
		const code = (err as { code?: string }).code ?? ''
		if (code === 'UNIQUE_VIOLATION')
			return { success: false, error: 'Book already exists in the library' }

		return { success: false, error: 'Operation failed' }
	}
}
