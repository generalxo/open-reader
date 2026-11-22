import { eq, sql } from 'drizzle-orm'
import { getDb } from '../db/index'
import { readingProgress } from '../db/schema'
import type { ReadingProgress } from '../db/schema'

export async function saveProgress(
	bookId: number,
	percentage: number,
	position: string,
): Promise<void> {
	await getDb()
		.insert(readingProgress)
		.values({ bookId, percentage, position })
		.onConflictDoUpdate({
			target: readingProgress.bookId,
			set: {
				percentage,
				position,
				lastReadAt: sql`(unixepoch())`,
			},
		})
}

export async function getProgress(bookId: number): Promise<ReadingProgress | null> {
	const [progress] = await getDb()
		.select()
		.from(readingProgress)
		.where(eq(readingProgress.bookId, bookId))
		.limit(1)

	return progress ?? null
}
