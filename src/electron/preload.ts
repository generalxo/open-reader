import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld('electronAPI', {
	zip: {
		getBookCoverPath: (bookpath: string) => ipcRenderer.invoke('zip:getBookCoverPath', bookpath),
		getBookCoverImage: (bookPath: string, coverPath: string) => ipcRenderer.invoke('zip:getBookCoverImage', bookPath, coverPath),
	},
	books: {
		pickAndAdd: () => ipcRenderer.invoke('db:books:pickAndAdd'),
		list: () => ipcRenderer.invoke('db:books:list'),
		get: (id: number) => ipcRenderer.invoke('db:books:get', id),
		remove: (id: number) => ipcRenderer.invoke('db:books:remove', id),
	},
	progress: {
		save: (bookId: number, percentage: number, position: string) =>
			ipcRenderer.invoke('db:progress:save', bookId, percentage, position),
		get: (bookId: number) => ipcRenderer.invoke('db:progress:get', bookId),
	},
	native: {
		filePicker: (pickFolder: boolean) => ipcRenderer.invoke('native:filePicker', pickFolder),
		openExternal: (url: string) => ipcRenderer.invoke('native:openExternal', url),
	},
	reader: {
		getSpine: (bookPath: string) => ipcRenderer.invoke('reader:getSpine', bookPath),
		getTocSource: (bookPath: string) => ipcRenderer.invoke('reader:getTocSource', bookPath),
	},
});
