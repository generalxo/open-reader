# open-reader

A clean, minimal EPUB reader for the desktop.

## Why

I wanted a decent way to read books on my desktop. Most e-reader apps are either outdated and unmaintained, or they push you toward a paid ecosystem where you basically have to buy in just to get something useful. I figured it would be a fun hobby project to build exactly what I wanted — nothing more, nothing less.

## Features

- **Library** — add EPUB files from your machine; covers are read from the book
- **Two reading modes** — paginated (like a physical book) or scrolling, switchable at any time without losing your place
- **Picks up where you left off** — your position is saved as you read, down to the exact line (EPUB CFI)
- **Table of contents** — EPUB 3 and EPUB 2 books, plus working footnotes and in-book links
- **Reading settings** — font size, line height, page width and Dark / Sepia / Light themes
- **Faithful rendering** — books are shown with their own styles and fonts, parsed as real XHTML
- **Keyboard and mouse** — arrow keys, Page Up/Down, Space and the mouse wheel turn pages

## Platform

Built and tested on Windows. Electron can also package for macOS and Linux (`npm run dist:mac` / `dist:linux`), but those builds are untested.

## Getting started

Requires [Node.js](https://nodejs.org/) 20.19+ or 22.12+.

```bash
git clone https://github.com/generalxo/open-reader.git
cd open-reader
npm install
npm run dev
```

`npm run dev` starts the Vite dev server and opens the Electron window.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run the app in development mode |
| `npm run build` | Type-check and bundle the renderer |
| `npm run lint` | Lint the whole project |
| `npm run test` / `npm run test:run` | Run the tests (watch / single run) |
| `npm run dist:win` | Package a Windows build (also `dist:mac`, `dist:linux`) |
| `npm run db:generate` | Generate a migration after changing `src/electron/db/schema.ts` |

## How it works

The app is split into Electron's two processes:

- **Main process** (`src/electron/`) — keeps the library and reading progress in a local SQLite database (Drizzle ORM + libsql), reads each EPUB's structure (spine, table of contents, covers), and serves the files inside a book through a custom `book://` protocol.
- **Renderer** (`src/`) — the React UI. The reader itself is a small, framework-free engine (`src/reader/`) behind a `ReaderEngine` interface; React only talks to that interface.

Each chapter is rendered in a **sandboxed iframe without script permissions**, so nothing inside a book can run code or reach the app. The engine lays chapters out with CSS columns (paginated) or as one scrolling column, and tracks your position as an exact EPUB CFI with a fallback to "how far through the chapter", so a resize, font change or mode switch keeps the same text in view.

### Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron |
| Frontend | React 19 + TypeScript |
| Routing | TanStack Router |
| Styling | Tailwind CSS 4 |
| Animations | Motion |
| Bundler | Vite |
| Database | SQLite via Drizzle ORM + libsql |
| EPUB parsing | adm-zip + fast-xml-parser (main), DOMParser (renderer) |
| Tests | Vitest + Testing Library |

## Roadmap

Ideas for what's next, in no particular order:

- Highlights and notes
- Fixed-layout EPUBs (comics, picture books)
- Smooth scrolling from one chapter into the next
- Font size that also scales books using fixed pixel sizes
- Library sorting, search and reading status

## Status

This is a personal hobby project. I build it for myself in my spare time — features get added when I feel like it.

## License

open-reader is free software, licensed under the [GNU General Public License v3.0 or later](LICENSE).

You're free to use, study, share and modify it. If you distribute it or a modified version, you must release the full source code under the same license, so it stays free for everyone.

Copyright (C) 2026 Oliver Wasner
