import { ipcMain } from 'electron'
import { getSpine, getChapterBundle } from '../services/readerService'

export function registerReaderHandlers() {
	ipcMain.handle('reader:getSpine', (_event, bookPath: string) => {
		return getSpine(bookPath)
	})

	ipcMain.handle('reader:getChapterBundle', (_event, bookPath: string, chapterHref: string) => {
		return getChapterBundle(bookPath, chapterHref)
	})
}
