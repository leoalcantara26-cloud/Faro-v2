'use client';

import { useState, useRef, useCallback } from 'react';

interface MicButtonProps {
  onTranscript: (text: string) => void;
  size?: 'sm' | 'lg';
}

export function MicButton({ onTranscript, size = 'lg' }: MicButtonProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'processing'>('idle');
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setState('processing');

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const form = new FormData();
        form.append('audio', blob, 'audio.webm');

        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: form });
          const data = await res.json() as { text?: string; error?: string };
          if (data.text) onTranscript(data.text);
        } catch {
          // silent fail — user can type instead
        } finally {
          setState('idle');
        }
      };

      recorder.start();
      mediaRef.current = recorder;
      setState('recording');
    } catch {
      setState('idle');
    }
  }, [onTranscript]);

  const stop = useCallback(() => {
    mediaRef.current?.stop();
    mediaRef.current = null;
  }, []);

  const toggle = () => {
    if (state === 'idle') start();
    else if (state === 'recording') stop();
  };

  const isLg = size === 'lg';

  const btnClass = isLg
    ? 'relative w-20 h-20 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 border'
    : 'relative w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 border flex-shrink-0';

  const idle   = 'bg-[#1a1a1a] border-[#303030] text-[#737373] hover:border-[#166534] hover:bg-[#0e1f14] hover:text-[#4ade80]';
  const rec    = 'bg-[#14532d] border-[#4ade80] text-[#4ade80]';
  const proc   = 'bg-[#1a1a1a] border-[#2a2a2a] text-[#404040] cursor-wait';

  const stateClass = state === 'recording' ? rec : state === 'processing' ? proc : idle;

  return (
    <button
      onClick={toggle}
      disabled={state === 'processing'}
      className={`${btnClass} ${stateClass}`}
      title={state === 'recording' ? 'Parar gravação' : 'Falar com o Faro'}
    >
      {/* Pulse ring when recording */}
      {state === 'recording' && (
        <span className="absolute inset-0 rounded-full border border-[#4ade80] opacity-40 animate-ping" />
      )}

      {state === 'processing' ? (
        <svg className="animate-spin" width={isLg ? 20 : 13} height={isLg ? 20 : 13} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="12"/>
        </svg>
      ) : (
        <svg width={isLg ? 26 : 14} height={isLg ? 26 : 14} viewBox="0 0 24 24" fill="none">
          <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M5 10C5 14.418 8.134 18 12 18C15.866 18 19 14.418 19 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          <path d="M12 18V22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  );
}
