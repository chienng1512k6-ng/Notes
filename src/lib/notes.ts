import Dexie, { type Table } from 'dexie';
import type { JSONContent } from '@tiptap/react';
import { readPreference, writePreference } from './preferences';

export const NOTE_COLORS = [
  { name: 'Trắng', value: 'white' },
  { name: 'Vàng nhạt', value: 'yellow' },
  { name: 'Xanh dương nhạt', value: 'blue' },
  { name: 'Xanh lá nhạt', value: 'green' },
  { name: 'Hồng nhạt', value: 'pink' },
  { name: 'Tím nhạt', value: 'purple' },
] as const;
export type NoteColor = (typeof NOTE_COLORS)[number]['value'];

export type Note = {
  id: string;
  title: string;
  content: JSONContent;
  backgroundColor: NoteColor;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  legacyContent?: string;
};

type StoredNote = Omit<Note, 'content'> & { content: JSONContent | string };

class NotesDatabase extends Dexie {
  notes!: Table<StoredNote, string>;
  constructor() {
    super('mini-notes');
    // Keep the first schema stable so existing records remain readable.
    this.version(1).stores({ notes: 'id, updatedAt, pinned' });
  }
}

export const db = new NotesDatabase();

export function noteStamp(row: { updatedAt?: number; createdAt?: number }): number {
  return Number.isFinite(row.updatedAt) ? row.updatedAt! : Number.isFinite(row.createdAt) ? row.createdAt! : 0;
}

export function plainTextToDoc(value: string): JSONContent {
  return { type: 'doc', content: value.split('\n').map(line => ({
    type: 'paragraph', content: line ? [{ type: 'text', text: line }] : [],
  })) };
}

export function normalizeNote(row: StoredNote): Note {
  const original = typeof row.content === 'string' ? row.content : undefined;
  const content: JSONContent = typeof row.content === 'string' ? plainTextToDoc(row.content) : row.content;
  return {
    ...row,
    title: typeof row.title === 'string' ? row.title : '',
    content: content?.type === 'doc' ? content : plainTextToDoc(''),
    backgroundColor: NOTE_COLORS.some(color => color.value === row.backgroundColor) ? row.backgroundColor : 'white',
    pinned: Boolean(row.pinned),
    createdAt: Number.isFinite(row.createdAt) ? row.createdAt : noteStamp(row),
    updatedAt: noteStamp(row),
    ...(original === undefined ? {} : { legacyContent: original }),
  };
}

export function createNote(): Note {
  const now = Date.now();
  return { id: crypto.randomUUID(), title: '', content: plainTextToDoc(''), backgroundColor: 'white', pinned: false, createdAt: now, updatedAt: now };
}

export function docText(node: JSONContent): string {
  if (!node || typeof node !== 'object') return '';
  if (node.type === 'text') return typeof node.text === 'string' ? node.text : '';
  return (Array.isArray(node.content) ? node.content : []).map(docText).join(node.type === 'doc' ? '\n' : '');
}

export async function loadNotes(): Promise<Note[]> {
  const rows = await db.notes.toArray();
  if (rows.length) return rows.map(normalizeNote);
  if (readPreference('mini-notes-imported-v1') === 'true') return [];

  // Import common prototype localStorage formats without deleting their originals.
  for (const key of ['mini-notes', 'miniNotes', 'notes']) {
    const raw = readPreference(key);
    if (!raw) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { continue; }
    if (!Array.isArray(parsed)) continue;
    const now = Date.now();
    const ids = new Set<string>();
    const imported = parsed.filter((item): item is Record<string, unknown> => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Record<string, unknown>;
      return typeof candidate.content === 'string' || typeof candidate.body === 'string'
        || (candidate.content !== null && typeof candidate.content === 'object' && (candidate.content as JSONContent).type === 'doc');
    }).map((item, index): Note => {
        const text = typeof item.content === 'string' ? item.content : typeof item.body === 'string' ? item.body : '';
        const content = typeof item.content === 'object' && item.content && (item.content as JSONContent).type === 'doc'
          ? item.content as JSONContent : plainTextToDoc(text);
        const color = NOTE_COLORS.find(entry => entry.value === item.backgroundColor)?.value || 'white';
        const id = typeof item.id === 'string' && item.id && !ids.has(item.id) ? item.id : crypto.randomUUID();
        ids.add(id);
        return {
          id,
          title: typeof item.title === 'string' ? item.title : '',
          content,
          backgroundColor: color,
          pinned: Boolean(item.pinned),
          createdAt: typeof item.createdAt === 'number' && Number.isFinite(item.createdAt) ? item.createdAt : now + index,
          updatedAt: typeof item.updatedAt === 'number' && Number.isFinite(item.updatedAt) ? item.updatedAt : now + index,
          ...(text ? { legacyContent: text } : {}),
        };
    });
    if (imported.length) {
      const result = await db.transaction('rw', db.notes, async () => {
        const existing = await db.notes.toArray();
        if (existing.length) return existing.map(normalizeNote);
        await db.notes.bulkAdd(imported);
        return imported;
      });
      writePreference('mini-notes-imported-v1', 'true');
      return result;
    }
  }
  return [];
}
