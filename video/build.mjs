// Genera index.html (composición Hyperframes) a partir de slides.mjs y de las duraciones reales del audio.
// Uso: node build.mjs   (requiere haber ejecutado antes: node make-audio.mjs)
import { writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { slides } from './slides.mjs';

const GAP = 1.0; // segundos de pausa al final de cada diapositiva
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

function body(s) {
  const t = `<h1 class="it">${esc(s.title)}</h1>`;
  const foot = s.footer ? `<p class="footer it">${esc(s.footer)}</p>` : '';
  switch (s.kind) {
    case 'title':
      return `<div class="center">${t}${(s.lines ?? []).map((l, i) => `<p class="${i === 0 ? 'sub' : 'meta'} it">${esc(l)}</p>`).join('')}</div>`;
    case 'bullets':
      return `${t}<ul>${s.items.map((i) => `<li class="it">${esc(i)}</li>`).join('')}</ul>${foot}`;
    case 'columns':
      return `${t}<div class="cols">${s.columns.map((c) => `<div class="col it"><h2>${esc(c.head)}</h2><ul>${c.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')}</div>`;
    case 'boxes':
      return `${t}<div class="boxes">${s.boxes.map((b) => `<div class="box it"><h2>${esc(b.head)}</h2><p>${esc(b.text)}</p></div>`).join('')}</div>${foot}`;
    case 'table':
      return `${t}<table class="it${s.rows.length > 8 ? ' dense' : ''}"><thead><tr>${s.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${s.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>${foot}`;
    case 'image':
      return `${t}<div class="imgwrap it"><img src="${s.image}" alt=""></div>`;
    case 'imageText':
      return `${t}<div class="split"><div class="imgwrap it"><img src="${s.image}" alt=""></div><ul>${s.items.map((i) => `<li class="it">${esc(i)}</li>`).join('')}</ul></div>`;
    case 'tree':
      return `${t}<pre class="tree it">${esc(s.tree.join('\n'))}</pre>${foot}`;
    case 'stats':
      return `${t}<div class="stats">${s.stats.map((x) => `<div class="stat it"><div class="value">${esc(x.value)}</div><div class="label">${esc(x.label)}</div></div>`).join('')}</div>${foot}`;
    default:
      throw new Error(`kind desconocido: ${s.kind}`);
  }
}

let t = 0;
const parts = [];
const anim = [];
slides.forEach((s, i) => {
  const wav = `audio/${s.id}.wav`;
  if (!existsSync(wav)) throw new Error(`Falta ${wav}; ejecute node make-audio.mjs`);
  const d = dur(wav);
  const total = +(d + GAP).toFixed(2);
  const start = +t.toFixed(2);
  parts.push(`<section id="${s.id}" class="slide clip" data-start="${start}" data-duration="${total}" data-track-index="0">${body(s)}<span class="num">${i + 1} / ${slides.length}</span></section>`);
  parts.push(`<audio id="a-${s.id}" src="${wav}" data-start="${start + 0.3}" data-duration="${(d).toFixed(2)}" data-track-index="1"></audio>`);
  anim.push(`tl.fromTo("#${s.id}", { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "none" }, ${start});`);
  anim.push(`tl.fromTo("#${s.id} .it", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", stagger: 0.35 }, ${(start + 0.3).toFixed(2)});`);
  t += total;
});

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1920, height=1080">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; color: #000; }
  html, body { width: 1920px; height: 1080px; overflow: hidden; background: #fff; }
  #root { position: relative; width: 1920px; height: 1080px; background: #fff; font-family: Arial, Helvetica, sans-serif; }
  .slide { position: absolute; inset: 0; padding: 90px 120px 80px; background: #fff; }
  h1 { font-size: 58px; font-weight: bold; line-height: 1.15; margin-bottom: 48px; }
  h2 { font-size: 38px; font-weight: bold; margin-bottom: 18px; }
  ul { list-style: none; }
  li { font-size: 40px; line-height: 1.3; margin-bottom: 26px; padding-left: 36px; position: relative; }
  li::before { content: "–"; position: absolute; left: 0; }
  .footer { font-size: 32px; margin-top: 36px; border-top: 2px solid #000; padding-top: 22px; }
  .num { position: absolute; right: 120px; bottom: 40px; font-size: 24px; }
  .center { height: 100%; display: flex; flex-direction: column; justify-content: center; }
  .center h1 { font-size: 84px; margin-bottom: 56px; }
  .sub { font-size: 44px; margin-bottom: 28px; font-weight: bold; }
  .meta { font-size: 34px; margin-bottom: 14px; }
  .cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 48px; }
  .col li { font-size: 33px; margin-bottom: 20px; }
  .col h2 { border-bottom: 2px solid #000; padding-bottom: 12px; }
  .boxes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px; }
  .box { border: 2px solid #000; padding: 28px 34px; }
  .box p { font-size: 34px; line-height: 1.3; }
  table { width: 100%; border-collapse: collapse; font-size: 34px; }
  table.dense { font-size: 29px; }
  th { text-align: left; font-weight: bold; padding: 12px 16px; border-top: 2px solid #000; border-bottom: 2px solid #000; }
  td { padding: 12px 16px; vertical-align: top; line-height: 1.25; }
  tbody tr:last-child td { border-bottom: 2px solid #000; }
  .imgwrap { display: flex; justify-content: center; align-items: center; }
  .imgwrap img { height: 800px; width: auto; max-width: 100%; display: block; }
  .split { display: grid; grid-template-columns: 760px 1fr; gap: 56px; align-items: start; }
  .split .imgwrap img { height: auto; width: 760px; max-height: 830px; border: 1px solid #000; }
  .split li { font-size: 33px; margin-bottom: 22px; }
  .tree { font-family: Arial, Helvetica, sans-serif; font-size: 36px; line-height: 1.7; white-space: pre; }
  .stats { display: grid; gap: 28px; }
  .stat { border: 2px solid #000; padding: 22px 34px; }
  .value { font-size: 66px; font-weight: bold; }
  .label { font-size: 32px; margin-top: 6px; }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${t.toFixed(2)}" data-width="1920" data-height="1080">
${parts.join('\n')}
</div>
<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });
  ${anim.join('\n  ')}
  window.__timelines["main"] = tl;
</script>
</body>
</html>
`;
writeFileSync(new URL('./index.html', import.meta.url), html);
const m = Math.floor(t / 60);
console.log(`index.html generado: ${slides.length} diapositivas, duración total ${m} min ${(t - m * 60).toFixed(0)} s`);
