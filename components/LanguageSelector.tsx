'use client';

const LANGUAGES = [
  { code: 'english', label: 'English' },
  { code: 'spanish', label: 'Spanish' },
  { code: 'french', label: 'French' },
  { code: 'german', label: 'German' },
  { code: 'italian', label: 'Italian' },
  { code: 'portuguese', label: 'Portuguese' },
  { code: 'hindi', label: 'Hindi' },
  { code: 'japanese', label: 'Japanese' },
  { code: 'korean', label: 'Korean' },
  { code: 'arabic', label: 'Arabic' },
  { code: 'turkish', label: 'Turkish' },
  { code: 'russian', label: 'Russian' },
  { code: 'thai', label: 'Thai' },
  { code: 'vietnamese', label: 'Vietnamese' }
];

export function LanguageSelector({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-white/80">Target language</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/90 outline-none transition focus:border-cyan-400/70 focus:bg-cyan-500/10"
      >
        {LANGUAGES.map((language) => (
          <option key={language.code} value={language.code} className="text-slate-900">
            {language.label}
          </option>
        ))}
      </select>
    </label>
  );
}
