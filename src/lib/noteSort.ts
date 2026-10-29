import type { Note } from './notes';

export const NOTE_SORT_OPTIONS = [
  { value: 'updated-desc', label: 'Cập nhật: mới nhất' },
  { value: 'updated-asc', label: 'Cập nhật: cũ nhất' },
  { value: 'title-asc', label: 'Tên: A → Z' },
  { value: 'title-desc', label: 'Tên: Z → A' },
] as const;

export type NoteSort = (typeof NOTE_SORT_OPTIONS)[number]['value'];
export const isNoteSort = (value: string | null): value is NoteSort =>
  NOTE_SORT_OPTIONS.some(option => option.value === value);

const titles = new Intl.Collator('vi', { sensitivity: 'base', numeric: true });

export function sortNotes(items: Note[], order: NoteSort = 'updated-desc'): Note[] {
  return [...items].sort((a, b) => {
    const pinned = Number(b.pinned) - Number(a.pinned);
    if (pinned) return pinned;
    const title = titles.compare(a.title.trim() || 'Ghi chú không tiêu đề', b.title.trim() || 'Ghi chú không tiêu đề');
    const comparison = order === 'title-asc' ? title : order === 'title-desc' ? -title
      : order === 'updated-asc' ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt;
    return comparison || b.updatedAt - a.updatedAt || a.id.localeCompare(b.id);
  });
}
