import { ipcMain } from "electron";
import { getBookCoverImage, getBookCoverPath } from "../services/zipService";

export function registerZipHandlers() {
	ipcMain.handle('zip:getBookCoverPath', async (_event, bookPath: string) => {
		return getBookCoverPath(bookPath);
	});

	ipcMain.handle('zip:getBookCoverImage', async (_event, bookPath: string, coverPath: string) => {
		return getBookCoverImage(bookPath, coverPath);
	});
}
