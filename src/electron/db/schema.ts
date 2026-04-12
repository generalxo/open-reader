import { int, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const books = sqliteTable('books', {
	id: int().primaryKey({ autoIncrement: true }),
	path: text().notNull().unique(),
	filename: text().notNull(),
	coverImagePath: text('cover_image_path'),
	dateAdded: int('date_added')
		.notNull()
		.default(sql`(unixepoch())`),
})

export const readingProgress = sqliteTable('reading_progress', {
	id: int().primaryKey({ autoIncrement: true }),
	bookId: int('book_id')
		.notNull()
		.unique()
		.references(() => books.id, { onDelete: 'cascade' }),
	percentage: real().notNull().default(0),
	position: text(),
	lastReadAt: int('last_read_at')
		.notNull()
		.default(sql`(unixepoch())`),
})

export type Book = typeof books.$inferSelect
export type NewBook = typeof books.$inferInsert
export type ReadingProgress = typeof readingProgress.$inferSelect
export type NewReadingProgress = typeof readingProgress.$inferInsert
