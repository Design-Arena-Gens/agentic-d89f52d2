'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ResultPanel } from '@/components/ResultPanel';
import { StatusTimeline, type StepKey, type TimelineStep } from '@/components/StatusTimeline';
import { base64ToUint8Array, uint8ToDataUrl, writeFileSafe } from '@/lib/audioUtils';
import { getFFmpeg } from '@/lib/ffmpegLoader';

const STEPS: { key: StepKey; label: string; description: string }[] = [
  { key: 'upload', label: 'Upload received', description: 'Audio queued for vocal isolation.' },
  { key: 'isolate', label: 'Isolating dialogue', description: 'Reducing center vocals to preserve instrumental bed.' },
  { key: 'transcribe', label: 'Transcribing speech', description: 'Generating source-language transcript with Whisper-quality accuracy.' },
  { key: 'translate', label: 'Translating meaning', description: 'Rewriting dialogue with semantic fidelity in the target language.' },
  { key: 'synthesize', label: 'Voicing translation', description: 'Synthesizing expressive speech aligned to the translated text.' },
  { key: 'mix', label: 'Rebalancing stems', description: 'Blending new vocals back into the original music bed.' },
  { key: 'done', label: 'Delivery ready', description: 'Mix rendered. Preview or download the final result.' }
];

type StepState = Record<StepKey, TimelineStep['state']>;

const INITIAL_STATE: StepState = {
  upload: 'pending',
  isolate: 'pending',
  transcribe: 'pending',
  translate: 'pending',
  synthesize: 'pending',
  mix: 'pending',
  done: 'pending'
};

const RESET_KEYS: StepKey[] = ['upload', 'isolate', 'transcribe', 'translate', 'synthesize', 'mix', 'done'];

export default function Page() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stepState, setStepState] = useState<StepState>(INITIAL_STATE);
  const [targetLanguage, setTargetLanguage] = useState('spanish');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [finalBlob, setFinalBlob] = useState<Blob | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [progressNote, setProgressNote] = useState<string>('Waiting for audio upload.');
  const [ffmpegVersion, setFfmpegVersion] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
    };
  }, [outputUrl, backgroundUrl]);

  const timelineSteps = useMemo<TimelineStep[]>(
    () =>
      STEPS.map((step) => ({
        ...step,
        state: stepState[step.key]
      })),
    [stepState]
  );

  const updateStep = useCallback((key: StepKey, state: TimelineStep['state']) => {
    setStepState((prev) => ({
      ...prev,
      [key]: state
    }));
  }, []);

  const resetWorkflow = useCallback(() => {
    setStepState((prev) => {
      const copy = { ...prev };
      RESET_KEYS.forEach((key) => {
        copy[key] = 'pending';
      });
      return copy;
    });
    setTranslatedText(null);
    setTranscript(null);
    setOutputUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setBackgroundUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFinalBlob(null);
    setError(null);
    setDetectedLanguage(null);
    setProgressNote('Ready to ingest audio.');
  }, []);

  const handleProcess = useCallback(async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    resetWorkflow();
    setProgressNote('Loading FFmpeg core for stem engineering…');

    let activeStep: StepKey | null = null;

    const markActive = (key: StepKey) => {
      activeStep = key;
      updateStep(key, 'active');
    };

    const markComplete = (key: StepKey) => {
      updateStep(key, 'complete');
      if (activeStep === key) {
        activeStep = null;
      }
    };

    try {
      markActive('upload');
      const ffmpeg = await getFFmpeg();
      if (!ffmpegVersion) {
        setFfmpegVersion('0.12.6');
      }

      markComplete('upload');
      markActive('isolate');
      setProgressNote('Isolating accompaniment bed and suppressing original vocals…');

      await writeFileSafe(ffmpeg, 'input.mp3', selectedFile);

      try {
        await ffmpeg.exec([
          '-y',
          '-i',
          'input.mp3',
          '-af',
          'pan=stereo|c0=0.6*c0-0.6*c1|c1=0.6*c1-0.6*c0',
          'bed.mp3'
        ]);
      } catch (isolationError) {
        console.warn('Vocal reduction hit fallback path', isolationError);
        await ffmpeg.exec(['-y', '-i', 'input.mp3', '-vn', '-acodec', 'copy', 'bed.mp3']);
      }

      const toUint8 = (data: string | Uint8Array): Uint8Array =>
        typeof data === 'string' ? new TextEncoder().encode(data) : data;

      let backingStem = toUint8(await ffmpeg.readFile('bed.mp3'));
      if (!backingStem || backingStem.length === 0) {
        backingStem = toUint8(await ffmpeg.readFile('input.mp3'));
      }

      const backingUrl = uint8ToDataUrl(backingStem, 'audio/mpeg');
      setBackgroundUrl(backingUrl);
      markComplete('isolate');

      markActive('transcribe');
      setProgressNote('Contacting speech model for transcription…');

      const formData = new FormData();
      formData.append('audio', selectedFile);
      formData.append('targetLanguage', targetLanguage);

      const response = await fetch('/api/translate', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const failure = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(failure.error || 'Translation request failed');
      }

      const payload: {
        transcript: string;
        translation: string;
        speechBase64: string;
        sourceLanguage: string;
      } = await response.json();

      setTranscript(payload.transcript);
      markComplete('transcribe');

      markActive('translate');
      setProgressNote(`Converting transcription into ${targetLanguage} dialogue…`);
      setTranslatedText(payload.translation);
      markComplete('translate');

      markActive('synthesize');
      setProgressNote('Synthesizing expressive speech from translated script…');

      const voiceBytes = base64ToUint8Array(payload.speechBase64);
      await writeFileSafe(ffmpeg, 'voice.mp3', voiceBytes);

      markComplete('synthesize');
      markActive('mix');
      setProgressNote('Merging new vocals with preserved musical bed…');

      await writeFileSafe(ffmpeg, 'bed.mp3', backingStem);

      try {
        await ffmpeg.exec([
          '-y',
          '-i',
          'bed.mp3',
          '-i',
          'voice.mp3',
          '-filter_complex',
          '[0:a]volume=0.92[a0];[1:a]adelay=120|120,volume=1.18,aresample=async=1[a1];[a0][a1]amix=inputs=2:duration=longest:dropout_transition=6[aout]',
          '-map',
          '[aout]',
          '-c:a',
          'mp3',
          '-ar',
          '44100',
          'final.mp3'
        ]);
      } catch (mixError) {
        console.warn('Blend pipeline fallback', mixError);
        await ffmpeg.exec([
          '-y',
          '-i',
          'voice.mp3',
          '-i',
          'bed.mp3',
          '-filter_complex',
          '[0:a]volume=1.2[a0];[1:a]volume=0.7[a1];[a0][a1]amix=inputs=2:duration=longest[aout]',
          '-map',
          '[aout]',
          '-c:a',
          'mp3',
          'final.mp3'
        ]);
      }

      const finalData = await ffmpeg.readFile('final.mp3');
      const finalAudio = new Blob([finalData], { type: 'audio/mpeg' });
      const finalUrl = URL.createObjectURL(finalAudio);
      setFinalBlob(finalAudio);
      setOutputUrl(finalUrl);
      setDetectedLanguage(payload.sourceLanguage);

      markComplete('mix');
      markActive('done');
      markComplete('done');
      setProgressNote('Render complete. Review before download.');
    } catch (processingError) {
      console.error(processingError);
      setError(processingError instanceof Error ? processingError.message : 'Processing failed');
      setProgressNote('Processing aborted. Fix the issue and retry.');
      if (activeStep) {
        updateStep(activeStep, 'error');
      } else {
        updateStep('upload', 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, targetLanguage, updateStep, resetWorkflow, ffmpegVersion, stepState]);

  const handleFileSelected = useCallback(
    (file: File) => {
      if (isProcessing) return;
      setSelectedFile(file);
      resetWorkflow();
      updateStep('upload', 'complete');
      setProgressNote('Audio ready. Launch processing when you are.');
    },
    [isProcessing, resetWorkflow, updateStep]
  );

  useEffect(() => {
    if (!selectedFile) {
      setStepState(INITIAL_STATE);
      setProgressNote('Waiting for audio upload.');
    }
  }, [selectedFile]);

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-6 py-16">
      <header className="space-y-4 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/90">
          LinguaFuse · Adaptive Dubbing
        </p>
        <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
          Swap dialogue across languages without sacrificing the original mix
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-white/70 md:text-base">
          Upload a mixed stem, let the agent isolate ambience, translate with semantic precision, and rebuild the scene with lifelike speech layered over your untouched background.
        </p>
      </header>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <FileDropzone onFileSelected={handleFileSelected} disabled={isProcessing} />

          <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <LanguageSelector value={targetLanguage} onChange={setTargetLanguage} disabled={isProcessing} />
              <div className="text-sm text-white/60">
                <p>Processing notes:</p>
                <p className="text-white/80">{progressNote}</p>
                {detectedLanguage && <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/40">Detected source: {detectedLanguage}</p>}
                {ffmpegVersion && <p className="text-[10px] uppercase tracking-[0.25em] text-white/30">FFmpeg core {ffmpegVersion}</p>}
              </div>
            </div>

            <button
              className="mt-6 w-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 px-6 py-3 font-semibold text-slate-950 shadow-xl shadow-blue-500/30 transition hover:brightness-105 disabled:bg-white/10 disabled:text-white/60"
              onClick={handleProcess}
              disabled={!selectedFile || isProcessing}
            >
              {isProcessing ? 'Processing…' : selectedFile ? 'Translate and Remix Audio' : 'Upload audio first'}
            </button>

            {error && <p className="mt-4 rounded-2xl border border-rose-400/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
            {selectedFile && !isProcessing && !error && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
                <p className="font-medium text-white/90">Loaded asset</p>
                <p>{selectedFile.name}</p>
                <p className="text-xs text-white/40">Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Type: {selectedFile.type || 'unknown'}</p>
              </div>
            )}

            {backgroundUrl && (
              <div className="mt-6 space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-medium text-white/80">Isolated background preview</p>
                <audio controls src={backgroundUrl} className="w-full" />
                <p className="text-xs text-white/50">We suppress center-channel energy to preserve ambience for the remix.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold text-white/90">Production timeline</h2>
            <p className="mt-1 text-sm text-white/60">Follow each stage from stem prep to the final localized mix.</p>
            <div className="mt-4 max-h-[32rem] overflow-y-auto pr-2">
              <StatusTimeline steps={timelineSteps} />
            </div>
          </div>

          <ResultPanel
            translatedText={translatedText}
            transcript={transcript}
            outputUrl={outputUrl}
            isLoading={isProcessing}
            onDownload={async () => finalBlob}
          />
        </div>
      </section>
    </main>
  );
}
