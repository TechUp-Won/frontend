"use client";

import { useRef, useEffect, useState } from "react";
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered,
  RemoveFormatting
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (value !== editorRef.current.innerHTML) {
        editorRef.current.innerHTML = value;
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const execCommand = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    editorRef.current?.focus();
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="w-full bg-drac-current border border-transparent rounded-xl focus-within:bg-drac-bg focus-within:border-drac-purple overflow-hidden transition-all flex flex-col shadow-sm">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-drac-comment/20 bg-drac-current shrink-0">
        <button type="button" onClick={() => execCommand("bold")} className="p-1.5 text-drac-fg hover:bg-drac-comment/20 rounded transition-colors" title="굵게">
          <Bold size={16} />
        </button>
        <button type="button" onClick={() => execCommand("italic")} className="p-1.5 text-drac-fg hover:bg-drac-comment/20 rounded transition-colors" title="기울임꼴">
          <Italic size={16} />
        </button>
        <button type="button" onClick={() => execCommand("underline")} className="p-1.5 text-drac-fg hover:bg-drac-comment/20 rounded transition-colors" title="밑줄">
          <Underline size={16} />
        </button>
        <button type="button" onClick={() => execCommand("strikeThrough")} className="p-1.5 text-drac-fg hover:bg-drac-comment/20 rounded transition-colors" title="취소선">
          <Strikethrough size={16} />
        </button>
        
        <div className="w-px h-5 bg-drac-comment/40 mx-1"></div>
        
        <button type="button" onClick={() => execCommand("formatBlock", "H1")} className="p-1.5 text-drac-fg hover:bg-drac-comment/20 rounded transition-colors" title="제목 1">
          <Heading1 size={16} />
        </button>
        <button type="button" onClick={() => execCommand("formatBlock", "H2")} className="p-1.5 text-drac-fg hover:bg-drac-comment/20 rounded transition-colors" title="제목 2">
          <Heading2 size={16} />
        </button>
        
        <div className="w-px h-5 bg-drac-comment/40 mx-1"></div>
        
        <button type="button" onClick={() => execCommand("insertUnorderedList")} className="p-1.5 text-drac-fg hover:bg-drac-comment/20 rounded transition-colors" title="기호 매기기">
          <List size={16} />
        </button>
        <button type="button" onClick={() => execCommand("insertOrderedList")} className="p-1.5 text-drac-fg hover:bg-drac-comment/20 rounded transition-colors" title="번호 매기기">
          <ListOrdered size={16} />
        </button>

        <div className="w-px h-5 bg-drac-comment/40 mx-1"></div>

        <button type="button" onClick={() => execCommand("removeFormat")} className="p-1.5 text-drac-fg hover:bg-drac-comment/20 rounded transition-colors" title="서식 지우기">
          <RemoveFormatting size={16} />
        </button>
      </div>
      
      <div 
        ref={editorRef}
        contentEditable
        className="rich-text p-4 outline-none min-h-[250px] text-[15px] text-drac-fg empty:before:content-[attr(data-placeholder)] empty:before:text-drac-comment/50 bg-transparent transition-colors"
        data-placeholder={placeholder}
        onInput={handleInput}
        onBlur={handleInput}
        suppressContentEditableWarning={true}
      />
    </div>
  );
}
