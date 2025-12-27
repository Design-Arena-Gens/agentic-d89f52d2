import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { toFile } from 'openai/uploads';

export const runtime = 'nodejs';
export const maxDuration = 60;

const formSchema = z.object({
  targetLanguage: z.string().min(2)
});

function assertEnv() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
}

export async function POST(request: Request) {
  try {
    assertEnv();

    const formData = await request.formData();
    const audio = formData.get('audio');
    const validated = formSchema.parse({
      targetLanguage: formData.get('targetLanguage')
    });

    if (!audio || !(audio instanceof File)) {
      return NextResponse.json({ error: 'Missing audio payload' }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const audioFile = await toFile(Buffer.from(await audio.arrayBuffer()), audio.name || 'audio-upload.wav', {
      type: audio.type || 'audio/mpeg'
    });

    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'gpt-4o-mini-transcribe',
      response_format: 'verbose_json'
    });

    const transcriptText = transcription.text?.trim();
    if (!transcriptText) {
      throw new Error('No transcript returned by speech model');
    }

    const sourceLanguage = ((transcription as { language?: string }).language ??
      (Array.isArray((transcription as { segments?: Array<{ language?: string }> }).segments)
        ? (transcription as { segments?: Array<{ language?: string }> }).segments?.[0]?.language
        : undefined) ?? 'auto');

    const translationResponse = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a dialogue adaptation specialist. Translate lines faithfully, preserving intent, tone, and timing cues. Return only the localized script with no extra commentary.'
        },
        {
          role: 'user',
          content: `Source language: ${sourceLanguage}.
Target language: ${validated.targetLanguage}.

Original transcript:
${transcriptText}`
        }
      ]
    });

    const translated = translationResponse.choices?.[0]?.message?.content?.trim();
    if (!translated) {
      throw new Error('Translation model returned empty output');
    }

    const ttsResponse = await client.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      response_format: 'mp3',
      input: translated
    });

    const speechBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    const speechBase64 = speechBuffer.toString('base64');

    return NextResponse.json({
      transcript: transcriptText,
      translation: translated,
      speechBase64,
      sourceLanguage
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
