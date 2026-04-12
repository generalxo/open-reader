import { ipcMain } from "electron";
import { getBookCoverImage, getBookCoverPath, getRootFileData, readEntry, zipTest } from "../services/zipService";

export function registerZipHandlers() {
	ipcMain.handle('zip:getRootFileData', async (_event, bookPath: string) => {
		return getRootFileData(bookPath);
	});

	ipcMain.handle('zip:getBookCoverPath', async (_event, bookPath: string) => {
		return getBookCoverPath(bookPath);
	});

	ipcMain.handle('zip:getBookCoverImage', async (_event, bookPath: string, coverPath: string) => {
		return getBookCoverImage(bookPath, coverPath);
	});

	ipcMain.handle('zip:readEntry', async (_event, entryName: string, bookPath: string) => {
		return readEntry(entryName, bookPath);
	});

	ipcMain.handle('zip:zipTest', async (_event, bookPath: string) => {
		return zipTest(bookPath);
	});
}
