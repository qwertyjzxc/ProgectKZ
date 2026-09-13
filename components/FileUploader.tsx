"use client";
import { useRef, useState } from "react";
import { Paperclip, Loader2, FileText, FileImage, X, File } from "lucide-react";

export interface AttachmentFile {
  name: string;
  url: string;
  size?: number;
}

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " Б";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " КБ";
  return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "webp", "gif", "avif", "heic", "bmp"].includes(ext)) {
    return <FileImage className="w-4 h-4 text-violet-500 shrink-0" />;
  }
  if (["pdf", "doc", "docx", "txt", "xls", "xlsx", "rtf"].includes(ext)) {
    return <FileText className="w-4 h-4 text-blue-500 shrink-0" />;
  }
  return <File className="w-4 h-4 text-gray-400 shrink-0" />;
}

interface FileUploaderProps {
  files: AttachmentFile[];
  onChange: (files: AttachmentFile[]) => void;
  title?: string;
  accept?: string;
  multiple?: boolean;
}

export default function FileUploader({ files, onChange, title, accept, multiple = true }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const sel = Array.from(e.target.files || []);
    if (!sel.length || !multiple && sel.length > 1) return;
    setUploading(true);
    try {
      const fd = new FormData();
      for (const f of sel) fd.append("files", f);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.files?.length) onChange([...files, ...data.files]);
    } catch { /* ignore */ }
    setUploading(false);
    e.target.value = "";
  };

  const remove = async (i: number) => {
    const target = files[i];
    onChange(files.filter((_, j) => j !== i));
    if (target) {
      try {
        await fetch("/api/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: target.url }),
        });
      } catch { /* ignore */ }
    }
  };

  return (
    <div>
      {title && <label className="text-xs text-gray-500 mb-1.5 block">{title}</label>}
      {files.length > 0 && (
        <ul className="space-y-1.5 mb-2">
          {files.map((f, i) => (
            <li key={f.url} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              {fileIcon(f.name)}
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-700 hover:text-blue-600 truncate flex-1" title={f.name}>
                {f.name}
              </a>
              {f.size ? <span className="text-[11px] text-gray-400 shrink-0">{formatSize(f.size)}</span> : null}
              <button type="button" onClick={() => remove(i)} className="text-gray-400 hover:text-red-500 shrink-0" title="Удалить файл">
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg px-3 py-2 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
        {uploading ? "Загрузка..." : files.length ? "Добавить ещё" : "Добавить файл"}
      </button>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={handleFiles} className="hidden" />
    </div>
  );
}