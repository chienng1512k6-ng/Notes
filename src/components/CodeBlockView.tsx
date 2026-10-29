'use client';

import { useEffect, useRef, useState } from 'react';
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Check, Copy } from 'lucide-react';

export default function CodeBlockView({ node }: NodeViewProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const reset = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (reset.current) clearTimeout(reset.current); }, []);

  const copy = async () => {
    try {
      // Only this explicit click writes code to the local clipboard. No network call.
      await navigator.clipboard.writeText(node.textContent);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
    if (reset.current) clearTimeout(reset.current);
    reset.current = setTimeout(() => setStatus('idle'), 2000);
  };

  return <NodeViewWrapper className="code-block">
    <div className="code-block-header" contentEditable={false}>
      <span>Mã nguồn</span>
      <button type="button" className="code-copy" aria-label="Sao chép mã" title="Sao chép mã" onClick={() => void copy()}>
        {status === 'copied' ? <Check size={14}/> : <Copy size={14}/>}
        <span aria-live="polite">{status === 'copied' ? 'Đã sao chép' : status === 'error' ? 'Không thể sao chép' : 'Copy'}</span>
      </button>
    </div>
    <pre spellCheck={false}><NodeViewContent<'code'> as="code" /></pre>
  </NodeViewWrapper>;
}
