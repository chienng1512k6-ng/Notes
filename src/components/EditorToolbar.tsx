'use client';

import type { Editor } from '@tiptap/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, Strikethrough, Highlighter, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, ListTodo, Undo2, Redo2, RemoveFormatting, Code2, MoreHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 32];

function Tool({ label, active, disabled, onClick, children }: {
  label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode;
}) {
  return <button type="button" title={label} aria-label={label} aria-pressed={active ?? false} disabled={disabled}
    onMouseDown={event => event.preventDefault()} onClick={onClick} className={`tool-button ${active ? 'active' : ''}`}>
    {children}
  </button>;
}

export default function EditorToolbar({ editor, dark }: { editor: Editor | null; dark: boolean }) {
  const [, redraw] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const moreButton = useRef<HTMLButtonElement>(null);
  const [visibleGroups, setVisibleGroups] = useState(5);
  const [open, setOpen] = useState(false);
  const widths = useRef<number[]>([]);

  useLayoutEffect(() => {
    if (!editor || !root.current) return;
    const element = root.current;
    const resize = () => {
      element.querySelectorAll<HTMLElement>('[data-tool-group]').forEach(group => {
        const width = group.getBoundingClientRect().width;
        if (width > 0) widths.current[Number(group.dataset.toolGroup)] = width;
      });
      const available = element.clientWidth - 48;
      const sizes = widths.current;
      if (sizes.length !== 5) return;
      if (sizes.reduce((sum, width) => sum + width + 3, 0) <= available) {
        setVisibleGroups(5);
        setOpen(false);
        return;
      }
      let used = 42;
      let count = 0;
      while (count < 5 && used + sizes[count] + 3 <= available) { used += sizes[count] + 3; count++; }
      setVisibleGroups(Math.max(1, count));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [editor]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); moreButton.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  useEffect(() => {
    if (!editor) return;
    const update = () => redraw(value => value + 1);
    editor.on('transaction', update);
    return () => { editor.off('transaction', update); };
  }, [editor]);
  if (!editor) return <div ref={root} className="toolbar" aria-label="Công cụ định dạng" />;

  const size = editor.getAttributes('textStyle').fontSize as string | undefined;
  const color = editor.getAttributes('textStyle').color as string | undefined;
  const defaultColor = dark ? '#f1edf5' : '#29262f';
  const textColors = dark
    ? [defaultColor, '#bba5d5', '#edaaa3', '#dec68d', '#a9c5a1', '#a8bfd4']
    : [defaultColor, '#70588d', '#9b4e50', '#806225', '#496a43', '#426681'];
  const can = editor.can();

  const inCode = editor.isActive('codeBlock');
  const groups = [
    <div key="marks" className="tool-group" data-tool-group="0">
      <Tool label="In đậm (Ctrl+B)" disabled={inCode} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={17}/></Tool>
      <Tool label="In nghiêng (Ctrl+I)" disabled={inCode} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={17}/></Tool>
      <Tool label="Gạch dưới (Ctrl+U)" disabled={inCode} active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline size={17}/></Tool>
      <Tool label="Gạch ngang" disabled={inCode} active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={17}/></Tool>
    </div>,
    <div key="colors" className="tool-group" data-tool-group="1">
      <label className="sr-only" htmlFor="font-size">Cỡ chữ</label>
      <select id="font-size" title="Cỡ chữ" disabled={inCode} className="toolbar-select" value={size || '16px'}
        onChange={event => editor.chain().focus().setMark('textStyle', { fontSize: event.target.value }).run()}>
        {FONT_SIZES.map(value => <option key={value} value={`${value}px`}>{value} px</option>)}
      </select>
      <div className="color-tool" title="Màu chữ">
        <span className="color-label">A</span><span className="color-underline" style={{ backgroundColor: color || defaultColor }}/>
        <label className="sr-only" htmlFor="text-color">Màu chữ tùy chỉnh</label>
        <input id="text-color" type="color" disabled={inCode} aria-label="Màu chữ tùy chỉnh" value={/^#[0-9a-f]{6}$/i.test(color || '') ? color : defaultColor}
          onChange={event => editor.chain().focus().setColor(event.target.value).run()} />
      </div>
      <div className="color-swatches" aria-label="Bảng màu chữ">
        {textColors.map(value => <button type="button" disabled={inCode} key={value} className={`text-swatch ${color === value ? 'selected' : ''}`} title={`Màu chữ ${value}`} aria-label={`Màu chữ ${value}`} aria-pressed={color === value}
          style={{ backgroundColor: value }} onMouseDown={event => event.preventDefault()} onClick={() => editor.chain().focus().setColor(value).run()} />)}
      </div>
      <Tool label="Tô sáng" disabled={inCode} active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight({ color: '#f5dc83' }).run()}><Highlighter size={17}/></Tool>
    </div>,
    <div key="alignment" className="tool-group" data-tool-group="2">
      <Tool label="Căn trái" disabled={inCode} active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={17}/></Tool>
      <Tool label="Căn giữa" disabled={inCode} active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={17}/></Tool>
      <Tool label="Căn phải" disabled={inCode} active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={17}/></Tool>
    </div>,
    <div key="blocks" className="tool-group" data-tool-group="3">
      <Tool label="Danh sách dấu đầu dòng" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={17}/></Tool>
      <Tool label="Danh sách đánh số" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={17}/></Tool>
      <Tool label="Danh sách việc cần làm" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}><ListTodo size={17}/></Tool>
      <Tool label="Code Block" active={inCode} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code2 size={17}/></Tool>
    </div>,
    <div key="history" className="tool-group" data-tool-group="4">
      <Tool label="Hoàn tác (Ctrl+Z)" disabled={!can.undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={17}/></Tool>
      <Tool label="Làm lại (Ctrl+Y)" disabled={!can.redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={17}/></Tool>
      <Tool label="Xóa định dạng" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><RemoveFormatting size={17}/></Tool>
    </div>,
  ];

  return <div ref={root} className="toolbar" role="toolbar" aria-label="Công cụ định dạng văn bản">
    {groups.slice(0, visibleGroups)}
    {visibleGroups < groups.length && <div className="toolbar-more">
      <button ref={moreButton} type="button" className={`tool-button ${open ? 'active' : ''}`} title="Công cụ khác" aria-label="Công cụ khác" aria-expanded={open} aria-controls="toolbar-overflow" onClick={() => setOpen(value => !value)}><MoreHorizontal size={19}/></button>
      <div id="toolbar-overflow" className="toolbar-overflow" role="group" aria-label="Công cụ bổ sung" hidden={!open}>
        {groups.slice(visibleGroups)}
      </div>
    </div>}
  </div>;
}
