import { app } from 'electron'
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { createClient } from '@libsql/client'
import path from 'path'
import * as schema from './schema'

type Schema = typeof schema

let _db: LibSQLDatabase<Schema>

export function getDb(): LibSQLDatabase<Schema> {
	if (!_db) throw new Error('Database not initialized. Call initializeDatabase() first.')
	return _db
}

export async function initializeDatabaseFromConfig(
	url: string,
	migrationsFolder: string,
): Promise<void> {
	const client = createClient({ url })
	const db = drizzle(client, { schema })
	await migrate(db, { migrationsFolder })
	_db = db
}

export async function initializeDatabase(): Promise<void> {
	const dbPath = path.join(app.getPath('userData'), 'open-reader.db')
	const migrationsFolder = app.isPackaged
		? path.join(process.resourcesPath, 'migrations')
		: path.join(app.getAppPath(), 'src/electron/db/migrations')
	await initializeDatabaseFromConfig(`file:${dbPath}`, migrationsFolder)
}
