'use client';

import { useEffect } from 'react';
import { EditorContent, ReactNodeViewRenderer, useEditor, type JSONContent } from '@tiptap/react';
import CodeBlock from '@tiptap/extension-code-block';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';
import EditorToolbar from './EditorToolbar';
import CodeBlockView from './CodeBlockView';

const NoteCodeBlock = CodeBlock.extend({
  addNodeView() { return ReactNodeViewRenderer(CodeBlockView); },
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Tab: () => this.editor.isActive('codeBlock')
        ? this.editor.commands.command(({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.insertText('\t'));
          return true;
        })
        : false,
    };
  },
}).configure({ exitOnTripleEnter: false });

const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{ types: ['textStyle'], attributes: { fontSize: {
      default: null,
      parseHTML: element => /^(12|14|16|18|20|24|32)px$/.test(element.style.fontSize) ? element.style.fontSize : null,
      renderHTML: attributes => /^(12|14|16|18|20|24|32)px$/.test(attributes.fontSize || '') ? { style: `font-size: ${attributes.fontSize}` } : {},
    } } }];
  },
});

type Props = { content: JSONContent; dark: boolean; readOnly?: boolean; onChange: (content: JSONContent) => void };

export default function RichTextEditor({ content, dark, readOnly = false, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false, underline: false, link: false }), NoteCodeBlock,
      Underline, TextStyle, FontSize, Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList, TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Bắt đầu viết ghi chú...' }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'note-content', 'aria-label': 'Nội dung ghi chú' },
      handlePaste: (view, event) => {
        const { $from } = view.state.selection;
        if ($from.parent.type.name !== 'codeBlock' || !event.clipboardData?.types.includes('text/plain')) return false;
        event.preventDefault();
        view.dispatch(view.state.tr.insertText(event.clipboardData.getData('text/plain')));
        return true;
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON()),
  });

  useEffect(() => { editor?.setEditable(!readOnly, false); }, [editor, readOnly]);

  useEffect(() => {
    if (!editor) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        editor.commands.redo();
      }
    };
    const dom = editor.view.dom;
    dom.addEventListener('keydown', onKeyDown);
    return () => dom.removeEventListener('keydown', onKeyDown);
  }, [editor]);

  return <div className="editor-stack">
    <EditorToolbar editor={editor} dark={dark} />
    <EditorContent editor={editor} className="editor-content" />
  </div>;
}
