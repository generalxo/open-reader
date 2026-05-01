import { vi, beforeEach, describe, expect, it } from 'vitest'
import path from 'path'
import { initializeDatabaseFromConfig } from '../../../src/electron/db'
import { pickAndAddBook, listBooks, getBook, removeBook } from '../../../src/electron/services/bookService'

vi.mock('../../../src/electron/services/nativeService.ts', () => ({
	filePicker: vi.fn(),
}))

vi.mock('../../../src/electron/services/zipService.ts', () => ({
	getBookCoverPath: vi.fn().mockResolvedValue(null),
}))

import { filePicker } from '../../../src/electron/services/nativeService'
const mockFilePicker = vi.mocked(filePicker)

const MIGRATIONS = path.join(process.cwd(), 'src/electron/db/migrations')

describe('bookService', () => {
	beforeEach(async () => {
		await initializeDatabaseFromConfig(':memory:', MIGRATIONS)
		mockFilePicker.mockReset()
	})

	describe('pickAndAddBook', () => {
		it('adds a book and returns success', async () => {
			mockFilePicker.mockResolvedValue({ cancelled: false, filePaths: ['/books/test.epub'] })

			const result = await pickAndAddBook()
			expect(result).toEqual(expect.objectContaining({ success: true }))

			const books = await listBooks()
			expect(books).toHaveLength(1)
			expect(books[0].path).toBe('/books/test.epub')
			expect(books[0].filename).toBe('test.epub')
			expect(books[0].id).toBeTypeOf('number')
		})

		it('returns error when book already exists', async () => {
			mockFilePicker.mockResolvedValue({ cancelled: false, filePaths: ['/books/test.epub'] })

			await pickAndAddBook()
			const result = await pickAndAddBook()
			expect(result).toEqual({ success: false, error: 'Book already exists in the library' })
		})

		it('returns cancelled error when user dismisses dialog', async () => {
			mockFilePicker.mockResolvedValue({ cancelled: true })

			const result = await pickAndAddBook()
			expect(result).toEqual({ success: false, error: 'cancelled' })
		})
	})

	describe('listBooks', () => {
		it('returns an empty array when no books exist', async () => {
			expect(await listBooks()).toEqual([])
		})

		it('returns all added books', async () => {
			mockFilePicker
				.mockResolvedValueOnce({ cancelled: false, filePaths: ['/books/a.epub'] })
				.mockResolvedValueOnce({ cancelled: false, filePaths: ['/books/b.epub'] })

			await pickAndAddBook()
			await pickAndAddBook()
			const books = await listBooks()
			expect(books).toHaveLength(2)
		})
	})

	describe('getBook', () => {
		it('returns the book by id', async () => {
			mockFilePicker.mockResolvedValue({ cancelled: false, filePaths: ['/books/test.epub'] })
			await pickAndAddBook()
			const [added] = await listBooks()

			const found = await getBook(added.id)
			expect(found?.path).toBe('/books/test.epub')
		})

		it('returns null for a non-existent id', async () => {
			expect(await getBook(99999)).toBeNull()
		})
	})

	describe('removeBook', () => {
		it('removes a book by id', async () => {
			mockFilePicker.mockResolvedValue({ cancelled: false, filePaths: ['/books/test.epub'] })
			await pickAndAddBook()
			const [book] = await listBooks()

			await removeBook(book.id)
			expect(await listBooks()).toHaveLength(0)
		})
	})
})
