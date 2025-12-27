'use client';

import { downloadBlob } from '@/lib/audioUtils';

export function ResultPanel({
  translatedText,
  transcript,
  outputUrl,
  onDownload,
  isLoading
}: {
  translatedText: string | null;
  transcript: string | null;
  outputUrl: string | null;
  onDownload: () => Promise<Blob | null>;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-6 rounded-3xl border border-white/5 bg-white/[0.02] p-6">
      <div>
        <h3 className="text-lg font-semibold text-white/90">Remixed Output</h3>
        <p className="text-sm text-white/60">Preview and download the translated dialogue layered over the original background.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
        {outputUrl ? (
          <audio controls src={outputUrl} className="w-full" />
        ) : (
          <p className="text-sm text-white/50">No render yet. Upload and process audio to preview the result.</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h4 className="font-medium text-white/80">Source Transcript</h4>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/60">
            {transcript || 'Transcription will appear here once processing is finished.'}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h4 className="font-medium text-white/80">Translated Dialogue</h4>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/60">
            {translatedText || 'Translation will appear here once processing is finished.'}
          </p>
        </div>
      </div>

      <button
        className="w-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 px-6 py-3 font-semibold text-slate-950 shadow-xl shadow-cyan-500/30 transition hover:brightness-110 disabled:bg-white/10 disabled:text-white/60"
        onClick={async () => {
          if (isLoading) return;
          const blob = await onDownload();
          if (!blob) return;
          downloadBlob(blob, 'linguafuse-output.mp3');
        }}
        disabled={isLoading || !outputUrl}
      >
        {isLoading ? 'Rendering…' : 'Download Final Mix'}
      </button>
    </div>
  );
}
