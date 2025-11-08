import type { SoundboardPad, SoundboardSheetData } from '../types';

/**
 * Generates a short, audible WAV file tone as a base64 data URI.
 * This provides audible feedback for default pads and avoids embedding large audio files.
 */
const createAudibleToneDataUri = (frequency: number): string => {
  const sampleRate = 8000;
  const duration = 0.2; // seconds
  const numFrames = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numFrames);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numFrames, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // "fmt " sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 1, true); // byteRate
  view.setUint16(32, 1, true); // blockAlign
  view.setUint16(34, 8, true); // 8-bit
  // "data" sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, numFrames, true);

  // Audio data (sine wave)
  for (let i = 0; i < numFrames; i++) {
    const value = 128 + Math.sin(i / sampleRate * 2 * Math.PI * frequency) * 127;
    view.setUint8(44 + i, value);
  }

  const binary = Array.from(new Uint8Array(buffer)).map(b => String.fromCharCode(b)).join('');
  return `data:audio/wav;base64,${btoa(binary)}`;
};

const defaultNamesPage1 = [
  'Air Horn', 'Scratch', 'Explosion', 'Yeah!',
  'Laser', 'Rewind', 'Bleep', 'Siren',
  'Smash', 'Gunshot', 'Buzzer', 'Alarm',
  'Clap', 'Bell', 'What?', 'Punch',
];

const generateDefaultSoundboardSheets = (): SoundboardSheetData => {
    const sheets: SoundboardSheetData = {};
    const totalSheets = 9;
    const padsPerSheet = 16;
    
    for (let sheet = 0; sheet < totalSheets; sheet++) {
        sheets[sheet] = [];
        for (let i = 0; i < padsPerSheet; i++) {
            const padId = sheet * padsPerSheet + i;
            const name = sheet === 0 ? defaultNamesPage1[i] : `Pad ${i + 1}`;
            const frequency = 440 + padId * 20; // Give each pad a unique tone
            sheets[sheet].push({
                id: padId,
                name: name,
                soundUrl: createAudibleToneDataUri(frequency),
            });
        }
    }
    return sheets;
};


export const DEFAULT_SOUNDBOARD_SHEETS = generateDefaultSoundboardSheets();
