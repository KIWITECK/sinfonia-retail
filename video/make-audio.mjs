// Genera la locución de cada diapositiva con la voz española de macOS (say) y la convierte a WAV.
// Uso: node make-audio.mjs   (150 ppm; 165 ppm en las diapositivas más largas para ajustar la duración total a ~15 min)
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { slides } from './slides.mjs';

const RATE = '150';
const FAST = { s03: '165', s05: '165', s12: '165', s15: '165' };
mkdirSync('audio', { recursive: true });
for (const s of slides) {
  const aiff = `audio/${s.id}.aiff`;
  execFileSync('say', ['-v', 'Paulina', '-r', FAST[s.id] ?? RATE, '-o', aiff, s.narration]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', aiff, '-ar', '44100', '-ac', '1', `audio/${s.id}.wav`]);
  rmSync(aiff);
}
console.log(`Audio generado para ${slides.length} diapositivas`);
