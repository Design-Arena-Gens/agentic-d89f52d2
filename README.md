# LinguaFuse Mixer

LinguaFuse Mixer is a Next.js agentic workflow for revoicing mixed audio scenes without sacrificing the original background bed. Upload an audio file, let the app suppress center-channel vocals, translate the dialogue with OpenAI models, synthesize a new voiceover, and blend it back over the preserved ambience.

## Features

- 🎧 Client-side FFmpeg (WebAssembly) pipeline for vocal suppression and remixing
- 🗣️ High-quality transcription via `gpt-4o-mini-transcribe`
- 🌐 Context-aware translation with `gpt-4o-mini`
- 🗯️ Expressive TTS generation using `tts-1`
- 🎚️ Adaptive amix balancing to keep the original background music intact
- 💡 Progress timeline, background stem preview, and downloadable final mix

## Prerequisites

- Node.js 18+
- npm 9+
- OpenAI API key with access to transcription, chat, and TTS endpoints (`OPENAI_API_KEY`)

## Setup

```bash
npm install
cp .env.example .env.local   # populate OPENAI_API_KEY
npm run dev
```

Visit `http://localhost:3000` to use the agent locally. The FFmpeg core loads on demand in the browser; the initial isolation step may take a few seconds.

## Deployment

For production builds:

```bash
npm run build
npm start
```

Deploy to Vercel with the provided command in this project README or CI workflow. Ensure `OPENAI_API_KEY` is configured as an environment variable in your deployment target.

## Environment Variables

Create `.env.local` with:

```
OPENAI_API_KEY=sk-...
```

Never commit secrets to version control.

## Tech Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS for styling
- `@ffmpeg/ffmpeg` + `@ffmpeg/util` (WASM core)
- OpenAI Node SDK v4
- Zod for form validation

## Limitations

- Vocal removal uses mid-side filtering; extremely vocal-forward mixes may retain residues.
- Processing happens client-side, so large files may stress weaker devices.
- Translation and synthesis quality depend on OpenAI models and available locales.

## License

MIT
