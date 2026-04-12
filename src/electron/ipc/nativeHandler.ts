import { ipcMain, shell } from 'electron'
import { filePicker } from '../services/nativeService'

export function registerNativeHandlers() {
	ipcMain.handle('native:filePicker', (_event, pickFolder: boolean) => filePicker(pickFolder));
	ipcMain.handle('native:openExternal', (_event, url: string) => shell.openExternal(url));
}
