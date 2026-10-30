"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  Moon,
  Sun,
  Plus,
  Pin,
  Trash2,
  Search,
  ArrowLeft,
  NotebookPen,
  Check,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  createNote,
  docText,
  loadNotes,
  NOTE_COLORS,
  type Note,
  type NoteColor,
} from "@/lib/notes";
import RichTextEditor from "./RichTextEditor";
import SidebarResizeHandle, { clampSidebarWidth } from "./SidebarResizeHandle";
import NoteSortControl from "./NoteSortControl";
import { isNoteSort, sortNotes, type NoteSort } from "@/lib/noteSort";
import { readPreference, writePreference } from '@/lib/preferences';
import { NoteConflictError, persistNote, removeNote } from '@/lib/persistence';

type SaveStatus = "saved" | "saving" | "error";

export default function NotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const notesRef = useRef<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [sort, setSort] = useState<NoteSort>('updated-desc');
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(310);
  const [fullWidth, setFullWidth] = useState(false);
  const [mobileEditor, setMobileEditor] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, SaveStatus>>({});
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const queues = useRef(new Map<string, Promise<void>>());
  const revisions = useRef(new Map<string, number>());
  const savedStamps = useRef(new Map<string, number>());
  const deleting = useRef(new Set<string>());

  const commit = useCallback((snapshot: Note, revision: number) => {
    setStatuses((current) => ({ ...current, [snapshot.id]: "saving" }));
    const previous = queues.current.get(snapshot.id) || Promise.resolve();
    const next = previous
      .catch(() => {})
      .then(async () => {
        await persistNote(snapshot, savedStamps.current.get(snapshot.id));
        savedStamps.current.set(snapshot.id, snapshot.updatedAt);
        if (revisions.current.get(snapshot.id) === revision) {
          setStatuses((current) => ({ ...current, [snapshot.id]: "saved" }));
          setSaveErrors(current => {
            const next = { ...current };
            delete next[snapshot.id];
            return next;
          });
        }
      })
      .catch((error: unknown) => {
        if (revisions.current.get(snapshot.id) === revision) {
          setStatuses((current) => ({ ...current, [snapshot.id]: "error" }));
          setSaveErrors(current => ({ ...current, [snapshot.id]: error instanceof NoteConflictError
            ? 'Ghi chú đã thay đổi ở cửa sổ khác. Hãy giữ lại chỉnh sửa hiện tại trước khi tải lại trang.'
            : 'Không lưu được ghi chú. Thử Ctrl+S để lưu lại; đừng đóng trang khi vẫn còn lỗi.' }));
        }
      });
    queues.current.set(snapshot.id, next);
  }, []);

  const schedule = useCallback(
    (note: Note) => {
      const revision = (revisions.current.get(note.id) || 0) + 1;
      revisions.current.set(note.id, revision);
      setStatuses((current) => ({ ...current, [note.id]: "saving" }));
      const prior = timers.current.get(note.id);
      if (prior) clearTimeout(prior);
      timers.current.set(
        note.id,
        setTimeout(() => {
          timers.current.delete(note.id);
          commit(note, revision);
        }, 650),
      );
    },
    [commit],
  );

  const updateNote = useCallback(
    (id: string, patch: Partial<Note>) => {
      const existing = notesRef.current.find((note) => note.id === id);
      if (!existing || deleting.current.has(id)) return;
      const updated = { ...existing, ...patch, updatedAt: Math.max(Date.now(), existing.updatedAt + 1) };
      notesRef.current = notesRef.current.map((note) =>
        note.id === id ? updated : note,
      );
      setNotes(notesRef.current);
      schedule(updated);
    },
    [schedule],
  );

  useEffect(() => () => {
    if (!selectedId) return;
    const timer = timers.current.get(selectedId);
    if (!timer) return;
    clearTimeout(timer);
    timers.current.delete(selectedId);
    const snapshot = notesRef.current.find(note => note.id === selectedId);
    if (snapshot && !deleting.current.has(selectedId)) {
      commit(snapshot, revisions.current.get(selectedId) || 0);
    }
  }, [selectedId, commit]);

  useEffect(() => {
    let cancelled = false;
    setDark(readPreference("mini-notes-theme") === "dark");
    const storedWidth = Number(readPreference("mini-notes-sidebar-width"));
    if (Number.isFinite(storedWidth) && storedWidth > 0) setSidebarWidth(clampSidebarWidth(storedWidth));
    setFullWidth(readPreference("mini-notes-full-width") === "true");
    const storedSort = readPreference('mini-notes-sort');
    const initialSort = isNoteSort(storedSort) ? storedSort : 'updated-desc';
    setSort(initialSort);
    loadNotes()
      .then((items) => {
        if (cancelled) return;
        notesRef.current = items;
        savedStamps.current = new Map(items.map(note => [note.id, note.updatedAt]));
        setNotes(items);
        setSelectedId(sortNotes(items, initialSort)[0]?.id || null);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) { setLoadError(true); setReady(true); }
      });
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle("dark", dark);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#211f26" : "#efeee9");
    writePreference("mini-notes-theme", dark ? "dark" : "light");
  }, [dark, ready]);

  useEffect(() => {
    if (!ready) return;
    writePreference("mini-notes-sidebar-width", String(sidebarWidth));
    writePreference("mini-notes-full-width", String(fullWidth));
    writePreference('mini-notes-sort', sort);
  }, [sidebarWidth, fullWidth, sort, ready]);

  useEffect(() => {
    const save = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== 's') return;
      event.preventDefault();
      if (event.repeat) return;
      const snapshot = notesRef.current.find(note => note.id === selectedId);
      if (!snapshot || deleting.current.has(snapshot.id)) return;
      const pending = timers.current.get(snapshot.id);
      if (pending) clearTimeout(pending);
      timers.current.delete(snapshot.id);
      // Join the same per-note queue as autosave using the latest in-memory snapshot.
      const revision = (revisions.current.get(snapshot.id) || 0) + 1;
      revisions.current.set(snapshot.id, revision);
      commit(snapshot, revision);
    };
    document.addEventListener('keydown', save, true);
    return () => document.removeEventListener('keydown', save, true);
  }, [selectedId, commit]);

  useEffect(() => {
    const deselectOnBlank = (event: PointerEvent) => {
      if (event.button !== 0 || !(event.target instanceof Element)) return;
      const target = event.target;
      // The entire editor panel is a writing surface, including its blank padding.
      if (target.closest('.note-panel')) return;
      if (target.closest('button, input, select, textarea, a, label, .color-tool, [role="menu"], [role="separator"]')) return;
      setSelectedId(null);
      setMobileEditor(false);
    };
    document.addEventListener('pointerdown', deselectOnBlank);
    return () => document.removeEventListener('pointerdown', deselectOnBlank);
  }, []);

  useEffect(() => {
    const flush = () => {
      if (document.visibilityState !== "hidden") return;
      for (const [id, timer] of timers.current) {
        clearTimeout(timer);
        timers.current.delete(id);
        const note = notesRef.current.find((item) => item.id === id);
        if (note) commit(note, revisions.current.get(id) || 0);
      }
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [commit]);

  const addNote = () => {
    if (!ready || loadError) return;
    const note = createNote();
    notesRef.current = [note, ...notesRef.current];
    setNotes(notesRef.current);
    setSelectedId(note.id);
    setMobileEditor(true);
    schedule(note);
  };

  const deleteNote = async (id: string) => {
    if (deleting.current.size) return;
    if (!window.confirm("Xóa ghi chú này?")) return;
    deleting.current.add(id);
    setDeletingId(id);
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    await queues.current.get(id)?.catch(() => {});
    try {
      await removeNote(id, savedStamps.current.get(id));
      revisions.current.delete(id);
      savedStamps.current.delete(id);
      notesRef.current = notesRef.current.filter((note) => note.id !== id);
      setNotes(notesRef.current);
      setSelectedId(current => current === id ? sortNotes(notesRef.current, sort)[0]?.id || null : current);
    } catch (error: unknown) {
      setStatuses((current) => ({ ...current, [id]: "error" }));
      setSaveErrors(current => ({ ...current, [id]: error instanceof NoteConflictError
        ? 'Ghi chú đã thay đổi ở cửa sổ khác; chưa xóa dữ liệu. Hãy giữ lại chỉnh sửa trước khi tải lại.'
        : 'Không xóa được ghi chú. Dữ liệu vẫn được giữ lại.' }));
    } finally {
      deleting.current.delete(id);
      setDeletingId(null);
    }
  };

  const selected = notes.find((note) => note.id === selectedId) || null;
  const visible = useMemo(
    () =>
      sortNotes(notes, sort).filter((note) => {
        if (pinnedOnly && !note.pinned) return false;
        const query = search.trim().toLocaleLowerCase("vi");
        return (
          !query ||
          `${note.title} ${docText(note.content)}`
            .toLocaleLowerCase("vi")
            .includes(query)
        );
      }),
    [notes, pinnedOnly, search, sort],
  );
  const status = selected ? statuses[selected.id] || "saved" : "saved";

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">
            <NotebookPen size={22} />
          </span>
          <div>
            <strong>Mini Notes</strong>
            <small>Không gian ghi chú cá nhân</small>
          </div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="icon-button"
            title={dark ? "Chế độ sáng" : "Chế độ tối"}
            aria-label={dark ? "Chế độ sáng" : "Chế độ tối"}
            onClick={() => setDark((value) => !value)}
          >
            {dark ? <Sun size={21} /> : <Moon size={21} />}
          </button>
          <button type="button" className="new-button" disabled={!ready || loadError} onClick={addNote}>
            <Plus size={20} />
            <span>Tạo mới</span>
          </button>
        </div>
      </header>
      {loadError && <div className="storage-alert" role="alert">Không đọc được dữ liệu ghi chú. Ứng dụng chưa tạo hay ghi đè dữ liệu. <button type="button" onClick={() => window.location.reload()}>Thử tải lại</button></div>}
      <main className={`workspace ${mobileEditor ? "show-editor" : ""}`} style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}>
        <aside className="sidebar" aria-label="Danh sách ghi chú" onKeyDown={event => {
          if (event.key === 'Escape' && !event.defaultPrevented) { setSelectedId(null); setMobileEditor(false); }
        }}>
          <div className="sidebar-controls">
            <div className="search-field">
              <Search size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm ghi chú..."
                aria-label="Tìm ghi chú"
              />
            </div>
            <div className="filter-row">
              <button
                type="button"
                className={!pinnedOnly ? "selected" : ""}
                onClick={() => setPinnedOnly(false)}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={pinnedOnly ? "selected" : ""}
                onClick={() => setPinnedOnly(true)}
              >
                <Pin size={15} /> Ghim
              </button>
              <NoteSortControl value={sort} onChange={setSort} />
            </div>
            <p className="note-count">{visible.length} ghi chú</p>
          </div>
          <div className="note-list">
            {visible.map((note) => (
              <button
                type="button"
                key={note.id}
                className={`note-card ${note.id === selectedId ? "selected" : ""}`}
                onClick={() => {
                  setSelectedId(note.id);
                  setMobileEditor(true);
                }}
              >
                <span
                  className={`note-color-dot color-${note.backgroundColor}`}
                  aria-hidden="true"
                />
                <span className="note-card-text">
                  <strong>
                    {note.title.trim() || "Ghi chú không tiêu đề"}
                  </strong>
                  <span>
                    {docText(note.content).trim() || "Bắt đầu viết ghi chú..."}
                  </span>
                  <small>
                    {new Intl.DateTimeFormat("vi-VN", {
                      day: "numeric",
                      month: "numeric",
                    }).format(note.updatedAt)}
                  </small>
                </span>
                {note.pinned && (
                  <Pin size={14} className="card-pin" aria-label="Đã ghim" />
                )}
              </button>
            ))}
            {ready && visible.length === 0 && (
              <p className="empty-list">
                {notes.length
                  ? "Không tìm thấy ghi chú."
                  : "Chưa có ghi chú. Nhấn “Tạo mới” để bắt đầu."}
              </p>
            )}
          </div>
          <div className="sidebar-footer">Mini Notes · Nguyễn Chiến</div>
        </aside>
        <SidebarResizeHandle width={sidebarWidth} onChange={setSidebarWidth} />
        <section
          className={`note-panel ${fullWidth ? 'full-width' : ''} ${selected ? `color-${selected.backgroundColor}` : ""}`}
          aria-label="Trình soạn thảo ghi chú"
        >
          {selected ? (
            <>
              <div className="note-actions">
                <button
                  type="button"
                  className="mobile-back icon-button"
                  title="Quay lại danh sách"
                  aria-label="Quay lại danh sách"
                  onClick={() => setMobileEditor(false)}
                >
                  <ArrowLeft size={19} />
                </button>
                <span className="palette-label">
                  <CheckCircle2 size={15} /> Màu nền
                </span>
                <div
                  className="note-palette"
                  role="group"
                  aria-label="Màu nền ghi chú"
                >
                  {NOTE_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      title={color.name}
                      aria-label={color.name}
                      aria-pressed={selected.backgroundColor === color.value}
                      className={`palette-swatch color-${color.value} ${selected.backgroundColor === color.value ? "selected" : ""}`}
                      onClick={() =>
                        updateNote(selected.id, {
                          backgroundColor: color.value as NoteColor,
                        })
                      }
                    >
                      {selected.backgroundColor === color.value && (
                        <Check size={14} strokeWidth={3} aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
                <span className="action-spacer" />
                <button type="button" className="icon-button width-toggle" title={fullWidth ? 'Giới hạn chiều rộng 850 px' : 'Mở rộng vùng viết'} aria-label={fullWidth ? 'Giới hạn chiều rộng 850 px' : 'Mở rộng vùng viết'} aria-pressed={fullWidth} onClick={() => setFullWidth(value => !value)}>
                  {fullWidth ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}
                </button>
                <button
                  type="button"
                  className={`icon-button ${selected.pinned ? "is-pinned" : ""}`}
                  title={selected.pinned ? "Bỏ ghim" : "Ghim ghi chú"}
                  aria-label={selected.pinned ? "Bỏ ghim" : "Ghim ghi chú"}
                  aria-pressed={selected.pinned}
                  onClick={() =>
                    updateNote(selected.id, { pinned: !selected.pinned })
                  }
                >
                  <Pin size={18} />
                </button>
                <button
                  type="button"
                  className="icon-button danger"
                  title="Xóa ghi chú"
                  aria-label="Xóa ghi chú"
                  disabled={deletingId !== null}
                  onClick={() => void deleteNote(selected.id)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <input
                className="title-input"
                aria-label="Tiêu đề ghi chú"
                placeholder="Tiêu đề"
                value={selected.title}
                disabled={deletingId === selected.id}
                onChange={(event) =>
                  updateNote(selected.id, { title: event.target.value })
                }
              />
              <RichTextEditor
                key={selected.id}
                content={selected.content}
                dark={dark}
                readOnly={deletingId === selected.id}
                onChange={(content) => updateNote(selected.id, { content })}
              />
              {status === 'error' && <div className="storage-alert" role="alert">{saveErrors[selected.id]}</div>}
              <footer className="editor-footer">
                <span>
                  {new Intl.DateTimeFormat("vi-VN", {
                    dateStyle: "medium",
                  }).format(selected.updatedAt)}
                </span>
                <span className={`save-status ${status}`} aria-live="polite">
                  {status === "saving" ? (
                    <>
                      <LoaderCircle size={14} className="spin" /> Đang lưu...
                    </>
                  ) : status === "error" ? (
                    <>
                      <AlertCircle size={14} /> Lỗi lưu
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Đã lưu
                    </>
                  )}
                </span>
                <span>
                  {
                    docText(selected.content)
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean).length
                  }{" "}
                  từ
                </span>
              </footer>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}
