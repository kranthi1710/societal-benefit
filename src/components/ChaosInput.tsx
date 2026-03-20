import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileImage, Send, Loader2 } from 'lucide-react';

interface ChaosInputProps {
  onSubmit: (text: string, file: File | null) => Promise<void>;
  isProcessing: boolean;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ChaosInput: React.FC<ChaosInputProps> = ({ onSubmit, isProcessing }) => {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text && !file) return;
    await onSubmit(text, file);
    setText('');
    setFile(null);
    setFileError(null);
  }, [text, file, onSubmit]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        setFileError(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
        return;
      }
      setFile(selectedFile);
    }
  }, []);

  return (
    <form 
      onSubmit={handleSubmit} 
      className="glass-card w-full max-w-3xl mx-auto flex flex-col gap-6 p-8"
      aria-label="Submit chaotic unstructured data for AI processing"
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold flex items-center gap-3 text-white" id="input-heading">
          <UploadCloud className="text-[var(--brand-cyan)]" aria-hidden="true" size={32} />
          Input Chaos
        </h2>
        <p className="text-[var(--text-muted)] font-light mt-1 text-lg" id="input-desc">Paste messy notes, radio logs, or a blurry photo.</p>
      </div>
      
      <label htmlFor="chaos-textarea" className="sr-only">Chaos Text Input</label>
      <textarea
        id="chaos-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g., 'Massive pileup on I-95 North, looks like 5 cars...'"
        className="premium-input h-40 resize-none w-full"
        disabled={isProcessing}
        aria-describedby="input-desc"
        aria-invalid={false}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
        <div className="w-full sm:w-auto">
          <label htmlFor="file-upload" className="sr-only">Upload Chaos File</label>
          <input 
            id="file-upload"
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange}
            accept="image/*,.pdf,.txt"
            disabled={isProcessing}
            aria-hidden="true" 
          />
          
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary w-full sm:w-auto"
            disabled={isProcessing}
            aria-label="Upload an image or document"
          >
            <FileImage size={20} aria-hidden="true" className={file ? "text-[var(--brand-pink)]" : "text-[var(--text-muted)]"} />
            <span>
              {file ? (file.name.length > 20 ? file.name.substring(0, 20) + "..." : file.name) : "Attach Evidence"}
            </span>
          </button>
          
          {fileError && (
            <p className="text-[var(--status-critical)] text-sm mt-3 font-semibold" role="alert">
              {fileError}
            </p>
          )}
        </div>

        <button 
          type="submit"
          disabled={isProcessing || (!text && !file)}
          className="btn-primary w-full sm:w-auto"
          aria-live="polite"
        >
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin" size={20} aria-hidden="true" />
              <span>Translating...</span>
            </>
          ) : (
            <>
              <Send size={20} aria-hidden="true" />
              <span>Determine Action</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
