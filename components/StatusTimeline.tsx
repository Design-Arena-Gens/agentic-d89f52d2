'use client';

import clsx from 'clsx';

export type StepKey =
  | 'upload'
  | 'isolate'
  | 'transcribe'
  | 'translate'
  | 'synthesize'
  | 'mix'
  | 'done';

export type TimelineStep = {
  key: StepKey;
  label: string;
  description: string;
  state: 'pending' | 'active' | 'complete' | 'error';
};

const ICONS: Record<TimelineStep['state'], string> = {
  pending: '⏳',
  active: '⚙️',
  complete: '✅',
  error: '⚠️'
};

export function StatusTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="space-y-3 text-sm">
      {steps.map((step) => (
        <li
          key={step.key}
          className={clsx(
            'rounded-xl border border-white/10 bg-white/[0.02] p-3 transition-colors',
            step.state === 'active' && 'border-cyan-400/80 bg-cyan-400/10 shadow-lg shadow-cyan-500/20',
            step.state === 'complete' && 'border-emerald-400/50 bg-emerald-400/10',
            step.state === 'error' && 'border-rose-500/60 bg-rose-500/10'
          )}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">{ICONS[step.state]}</span>
            <div>
              <p className="font-medium tracking-wide text-white/90">{step.label}</p>
              <p className="text-white/60">{step.description}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
