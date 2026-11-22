import { ipcMain } from 'electron'
import { getSpine, getTocSource } from '../services/readerService'

export function registerReaderHandlers() {
	ipcMain.handle('reader:getSpine', (_event, bookPath: string) => {
		return getSpine(bookPath)
	})

	ipcMain.handle('reader:getTocSource', (_event, bookPath: string) => {
		return getTocSource(bookPath)
	})
}
