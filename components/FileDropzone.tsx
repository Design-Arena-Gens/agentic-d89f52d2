'use client';

import { useCallback, useRef } from 'react';

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/x-m4a'];

export function FileDropzone({
  disabled,
  onFileSelected
}: {
  disabled?: boolean;
  onFileSelected: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleClick = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || !files[0]) return;
      const file = files[0];
      if (!ACCEPTED_TYPES.includes(file.type)) {
        const fallbackType = file.name.split('.').pop()?.toLowerCase() ?? '';
        const allowByExtension = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'webm'].includes(fallbackType);
        if (!allowByExtension) {
          alert('Unsupported audio format. Please upload MP3, WAV, M4A, AAC, OGG, or WEBM.');
          return;
        }
      }
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (disabled) return;
      handleFiles(event.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(event.target.files);
    },
    [handleFiles]
  );

  return (
    <div
      onClick={handleClick}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      className="group relative flex h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/20 bg-white/[0.03] p-6 text-center transition hover:border-cyan-400/60 hover:bg-cyan-400/5"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-2xl text-cyan-300 shadow-lg shadow-cyan-500/20">
        🎧
      </div>
      <div>
        <p className="text-lg font-semibold text-white/90">Drop your mixed audio</p>
        <p className="text-sm text-white/60">We will isolate the dialogue, translate it, and remix without losing the original backing track.</p>
      </div>
      <p className="text-xs uppercase tracking-[0.25em] text-white/40">MP3 · WAV · M4A · AAC · OGG</p>
    </div>
  );
}
