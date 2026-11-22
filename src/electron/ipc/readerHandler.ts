import { ipcMain } from 'electron'
import { getSpine, getChapterBundle, getTocSource } from '../services/readerService'

export function registerReaderHandlers() {
	ipcMain.handle('reader:getSpine', (_event, bookPath: string) => {
		return getSpine(bookPath)
	})

	ipcMain.handle('reader:getTocSource', (_event, bookPath: string) => {
		return getTocSource(bookPath)
	})

	ipcMain.handle('reader:getChapterBundle', (_event, bookPath: string, chapterHref: string) => {
		return getChapterBundle(bookPath, chapterHref)
	})
}
