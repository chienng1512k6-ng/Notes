'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDownAZ, ArrowUpAZ, Check, ClockArrowDown, ClockArrowUp } from 'lucide-react';
import { NOTE_SORT_OPTIONS, type NoteSort } from '@/lib/noteSort';

export default function NoteSortControl({ value, onChange }: { value: NoteSort; onChange: (value: NoteSort) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const Icon = value === 'title-asc' ? ArrowDownAZ : value === 'title-desc' ? ArrowUpAZ
    : value === 'updated-asc' ? ClockArrowUp : ClockArrowDown;
  const selected = NOTE_SORT_OPTIONS.find(option => option.value === value)!;

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  return <div ref={root} className="note-sort">
    <button ref={trigger} type="button" className={`note-sort-trigger ${open ? 'active' : ''}`} title={`Sắp xếp ghi chú — ${selected.label}`} aria-label="Sắp xếp ghi chú" aria-haspopup="menu" aria-expanded={open} aria-controls="note-sort-menu" onClick={() => setOpen(current => !current)} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); }
    }}><Icon size={19} aria-hidden="true" /></button>
    {open && <div ref={menu} id="note-sort-menu" className="note-sort-menu" role="menu" aria-label="Sắp xếp ghi chú" onKeyDown={event => {
      const items = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') || []);
      const index = items.indexOf(document.activeElement as HTMLButtonElement);
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus();
      } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      } else if (event.key === 'Tab') { setOpen(false); trigger.current?.focus(); }
    }}>
      <div className="note-sort-heading" role="presentation">Sắp xếp ghi chú</div>
      {NOTE_SORT_OPTIONS.map(option => <button key={option.value} type="button" role="menuitemradio" aria-checked={value === option.value} tabIndex={-1} className={`note-sort-option ${value === option.value ? 'selected' : ''}`} onClick={() => {
        onChange(option.value); setOpen(false); trigger.current?.focus();
      }}><span>{option.label}</span>{value === option.value && <Check size={16} aria-hidden="true" />}</button>)}
      <div className="note-sort-hint" role="presentation">Ghi chú ghim luôn ở trên</div>
    </div>}
  </div>;
}
