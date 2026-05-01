// src/routes/reader/-components/ReaderContainer.tsx
import { useState, useEffect } from "react";
import type { SpineItem } from "../../../types/models/spineItem";
import type { ReadingMode } from "../../../types/models/readingMode";
import PagedReader from "./PagedReader";
import ScrollableReader from "./ScrollableReader";

interface ReaderContainerProps {
  bookPath: string;
}

export default function ReaderContainer({ bookPath }: ReaderContainerProps) {
  const [spine, setSpine] = useState<SpineItem[]>([]);
  const [mode, setMode] = useState<ReadingMode>("scroll");

  useEffect(() => {
    void (async () => {
      setSpine(await window.electronAPI.reader.getSpine(bookPath));
    })();
  }, [bookPath]);

  if (spine.length === 0) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end gap-2 px-4 h-10 bg-[#13131f] border-b border-[#222] shrink-0">
        <button
          onClick={() => setMode("scroll")}
          className={`text-xs px-3 py-1 rounded border transition-colors ${
            mode === "scroll"
              ? "text-indigo-300 border-indigo-500 bg-[#1e1e2e]"
              : "text-[#555] border-[#333] bg-[#1e1e2e]"
          }`}
        >
          Scroll
        </button>
        <button
          onClick={() => setMode("page")}
          className={`text-xs px-3 py-1 rounded border transition-colors ${
            mode === "page"
              ? "text-indigo-300 border-indigo-500 bg-[#1e1e2e]"
              : "text-[#555] border-[#333] bg-[#1e1e2e]"
          }`}
        >
          Pages
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex justify-center">
        <div className="w-full max-w-[700px] h-full overflow-hidden">
          {mode === "scroll" ? (
            <ScrollableReader bookPath={bookPath} spine={spine} />
          ) : (
            <PagedReader bookPath={bookPath} spine={spine} />
          )}
        </div>
      </div>
    </div>
  );
}
