import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileImage, Send, Loader2, Mic, MicOff } from 'lucide-react';
import { executeRecaptcha } from '../services/recaptchaService';
import { trackEvent } from '../services/analyticsService';

interface ChaosInputProps {
  onSubmit: (text: string, file: File | null) => Promise<void>;
  isProcessing: boolean;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Web Speech API — powered by Google's speech infrastructure in Chrome/Edge
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const ChaosInput: React.FC<ChaosInputProps> = ({ onSubmit, isProcessing }) => {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text && !file) return;

    // Google reCAPTCHA v3 — silent bot scoring before contacting Google Gemini
    try {
      const token = await executeRecaptcha('chaos_submit');
      if (token) {
        trackEvent('recaptcha_scored', { token_length: token.length });
      }
    } catch {
      // Non-blocking — proceed even if reCAPTCHA fails
    }

    await onSubmit(text, file);
    setText('');
    setFile(null);
    setFileError(null);
  }, [text, file, onSubmit]);

  // Google Web Speech API — voice input
  const toggleVoiceInput = useCallback(() => {
    if (!SpeechRecognition) {
      trackEvent('voice_input_unsupported');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      trackEvent('voice_input_started');
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setText(prev => prev ? `${prev} ${transcript}` : transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
      trackEvent('voice_input_ended');
    };

    recognition.onerror = (event: any) => {
      console.warn('[SpeechRecognition] Error:', event.error);
      setIsListening(false);
      trackEvent('voice_input_error', { error: event.error });
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening]);

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

  const voiceSupported = !!SpeechRecognition;

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-card chaos-form"
      aria-label="Submit chaotic unstructured data for AI processing"
    >
      <div className="chaos-form-header">
        <h2 className="chaos-heading" id="input-heading">
          <UploadCloud className="icon-cyan" aria-hidden="true" size={32} />
          Input Chaos
        </h2>
        <p className="chaos-desc" id="input-desc">Paste messy notes, radio logs, speak aloud, or attach a photo.</p>
      </div>

      <div style={{ position: 'relative' }}>
        <label htmlFor="chaos-textarea" className="sr-only">Chaos Text Input</label>
        <textarea
          id="chaos-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g., 'Massive pileup on I-95 North, looks like 5 cars...' — or click the mic 🎤"
          className="premium-input chaos-textarea"
          disabled={isProcessing}
          aria-describedby="input-desc"
          aria-invalid={false}
          style={{ paddingRight: voiceSupported ? '3.5rem' : undefined }}
        />
        {voiceSupported && (
          <button
            type="button"
            onClick={toggleVoiceInput}
            disabled={isProcessing}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input (Google Speech Recognition)'}
            title={isListening ? 'Stop listening' : 'Speak your emergency input'}
            style={{
              position: 'absolute',
              right: '0.9rem',
              top: '0.9rem',
              background: isListening ? 'rgba(255, 42, 95, 0.2)' : 'rgba(0, 240, 255, 0.1)',
              border: `1px solid ${isListening ? 'var(--status-critical)' : 'rgba(0,240,255,0.3)'}`,
              borderRadius: '0.6rem',
              padding: '0.45rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            {isListening
              ? <MicOff size={18} color="var(--status-critical)" aria-hidden="true" style={{ animation: 'pulse 1s infinite' }} />
              : <Mic size={18} color="var(--brand-cyan)" aria-hidden="true" />
            }
          </button>
        )}
      </div>

      {isListening && (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            color: 'var(--status-critical)', fontSize: '0.82rem', fontWeight: 600,
            paddingLeft: '0.25rem', animation: 'pulse 1.2s infinite'
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-critical)', display: 'inline-block' }} />
          Listening via Google Speech Recognition...
        </div>
      )}

      <div className="chaos-actions">
        <div className="chaos-upload-group">
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
            className="btn-secondary chaos-btn"
            disabled={isProcessing}
            aria-label="Upload an image or document"
          >
            <FileImage size={20} aria-hidden="true" className={file ? "icon-pink" : "icon-muted"} />
            <span>
              {file ? (file.name.length > 20 ? file.name.substring(0, 20) + "..." : file.name) : "Attach Evidence"}
            </span>
          </button>

          {fileError && (
            <p className="error-text" role="alert">
              {fileError}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isProcessing || (!text && !file)}
          className="btn-primary chaos-btn submit-btn"
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
