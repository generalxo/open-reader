import { vi, beforeEach, describe, expect, it } from 'vitest'
import path from 'path'
import { initializeDatabaseFromConfig } from '../../../src/electron/db'
import { pickAndAddBook, listBooks } from '../../../src/electron/services/bookService'
import { saveProgress, getProgress } from '../../../src/electron/services/progressService'

vi.mock('../../../src/electron/services/nativeService.ts', () => ({
	filePicker: vi.fn(),
}))

vi.mock('../../../src/electron/services/zipService.ts', () => ({
	getBookCoverPath: vi.fn().mockResolvedValue(null),
}))

import { filePicker } from '../../../src/electron/services/nativeService'
const mockFilePicker = vi.mocked(filePicker)

const MIGRATIONS = path.join(process.cwd(), 'src/electron/db/migrations')

describe('progressService', () => {
  beforeEach(async () => {
    await initializeDatabaseFromConfig(':memory:', MIGRATIONS)
    mockFilePicker.mockReset()
  })

  it('returns null when no progress exists for a book', async () => {
    expect(await getProgress(99999)).toBeNull()
  })

  it('saves and retrieves reading progress', async () => {
    mockFilePicker.mockResolvedValue({ cancelled: false, filePaths: ['/books/test.epub'] })
    await pickAndAddBook()
    const [book] = await listBooks()

    await saveProgress(book.id, 42.5, 'chapter-3')
    const progress = await getProgress(book.id)
    expect(progress?.percentage).toBe(42.5)
    expect(progress?.position).toBe('chapter-3')
    expect(progress?.bookId).toBe(book.id)
  })

  it('updates existing progress on subsequent save', async () => {
    mockFilePicker.mockResolvedValue({ cancelled: false, filePaths: ['/books/test.epub'] })
    await pickAndAddBook()
    const [book] = await listBooks()

    await saveProgress(book.id, 10, 'chapter-1')
    await saveProgress(book.id, 50, 'chapter-5')
    const progress = await getProgress(book.id)
    expect(progress?.percentage).toBe(50)
    expect(progress?.position).toBe('chapter-5')
  })
})
