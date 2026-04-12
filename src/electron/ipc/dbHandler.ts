import { ipcMain } from 'electron'
import { pickAndAddBook, listBooks, getBook, removeBook } from '../services/bookService'
import { saveProgress, getProgress } from '../services/progressService'

export function registerDbHandlers(): void {
  ipcMain.handle('db:books:pickAndAdd', () => pickAndAddBook())
  ipcMain.handle('db:books:list', () => listBooks())
  ipcMain.handle('db:books:get', (_event, id: number) => getBook(id))
  ipcMain.handle('db:books:remove', (_event, id: number) => removeBook(id))

  ipcMain.handle(
    'db:progress:save',
    (_event, bookId: number, percentage: number, position: string) =>
      saveProgress(bookId, percentage, position),
  )
  ipcMain.handle('db:progress:get', (_event, bookId: number) => getProgress(bookId))
}
