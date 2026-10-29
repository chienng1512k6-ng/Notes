import { db, noteStamp, type Note } from './notes';

export class NoteConflictError extends Error {
  constructor() { super('Note changed in another window'); this.name = 'NoteConflictError'; }
}

// Compare and write in one IndexedDB transaction, including across browser tabs.
export async function persistNote(note: Note, expectedUpdatedAt: number | undefined): Promise<void> {
  await db.transaction('rw', db.notes, async () => {
    const stored = await db.notes.get(note.id);
    if ((stored ? noteStamp(stored) : undefined) !== expectedUpdatedAt) throw new NoteConflictError();
    await db.notes.put(note);
  });
}

export async function removeNote(id: string, expectedUpdatedAt: number | undefined): Promise<void> {
  await db.transaction('rw', db.notes, async () => {
    const stored = await db.notes.get(id);
    if ((stored ? noteStamp(stored) : undefined) !== expectedUpdatedAt) throw new NoteConflictError();
    await db.notes.delete(id);
  });
}
