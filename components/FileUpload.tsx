import React, { useRef, useState } from 'react';

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelect, disabled }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelect(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelect(Array.from(e.target.files));
    }
  };

  return (
    <div 
      className={`relative w-full max-w-xl mx-auto rounded-xl p-12 text-center transition-all duration-300 ease-out group
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${dragActive 
          ? 'bg-kaggle-blue/5 border-2 border-kaggle-blue' 
          : 'bg-surface/50 border border-dashed border-border hover:border-kaggle-blue/40 hover:bg-surfaceHighlight/30'}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".csv,.txt,.png,.jpg,.jpeg,.webp,.md,.pdf"
        multiple
        onChange={handleChange}
        disabled={disabled}
      />
      
      <div className="flex flex-col items-center gap-6 relative z-10">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-300
          ${dragActive ? 'bg-kaggle-blue text-white' : 'bg-surfaceHighlight border border-border text-kaggle-muted group-hover:text-white group-hover:border-kaggle-blue/30'}
        `}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:-translate-y-1">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white group-hover:text-kaggle-blue transition-colors">
            Drop files here
          </h3>
          <p className="text-kaggle-muted text-sm max-w-xs mx-auto leading-relaxed">
            Support for <span className="text-kaggle-text">CSV, TXT, Markdown, PDF</span>. <br/>
            <span className="text-xs text-slate-500">Multimodal: Upload diagrams, handwritten notes & rules</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;