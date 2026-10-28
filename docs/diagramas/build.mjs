// Genera los diagramas UML (SVG monocromo) del informe. Uso: node docs/diagramas/build.mjs
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.dirname(fileURLToPath(import.meta.url));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

class Svg {
  constructor(w, h) { this.w = w; this.h = h; this.parts = []; }
  add(s) { this.parts.push(s); return this; }
  text(x, y, s, { anchor = 'start', bold = false, italic = false, size = 13 } = {}) {
    return this.add(`<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}"${bold ? ' font-weight="bold"' : ''}${italic ? ' font-style="italic"' : ''}>${esc(s)}</text>`);
  }
  label(x, y, s, opts = {}) { // texto con fondo blanco para legibilidad sobre líneas
    const w = s.length * 6.4 + 10;
    this.add(`<rect x="${x - w / 2}" y="${y - 12}" width="${w}" height="16" fill="#fff" stroke="none"/>`);
    return this.text(x, y, s, { anchor: 'middle', italic: true, size: 12, ...opts });
  }
  rect(x, y, w, h, { dashed = false, rx = 0 } = {}) {
    return this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="#fff" stroke="#000" stroke-width="1.3"${dashed ? ' stroke-dasharray="6 4"' : ''}/>`);
  }
  line(x1, y1, x2, y2, { dashed = false, arrow = null, start = null } = {}) {
    this.add(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000" stroke-width="1.3"${dashed ? ' stroke-dasharray="6 4"' : ''}/>`);
    if (arrow) this.head(x1, y1, x2, y2, arrow);
    if (start) this.head(x2, y2, x1, y1, start);
    return this;
  }
  poly(points, opts = {}) {
    for (let i = 0; i < points.length - 1; i++) {
      const last = i === points.length - 2;
      this.line(...points[i], ...points[i + 1], { dashed: opts.dashed, arrow: last ? opts.arrow : null, start: i === 0 ? opts.start : null });
    }
    return this;
  }
  // Punta en (x2,y2) mirando desde (x1,y1).
  head(x1, y1, x2, y2, kind) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const p = (d, side) => [x2 - d * Math.cos(a) + side * Math.sin(a), y2 - d * Math.sin(a) - side * Math.cos(a)];
    if (kind === 'open') {
      const [ax, ay] = p(11, 5); const [bx, by] = p(11, -5);
      this.add(`<polyline points="${ax},${ay} ${x2},${y2} ${bx},${by}" fill="none" stroke="#000" stroke-width="1.3"/>`);
    } else if (kind === 'solid') {
      const [ax, ay] = p(11, 5); const [bx, by] = p(11, -5);
      this.add(`<polygon points="${ax},${ay} ${x2},${y2} ${bx},${by}" fill="#000" stroke="#000"/>`);
    } else if (kind === 'diamond') {
      const [ax, ay] = p(9, 5); const [bx, by] = p(18, 0); const [cx, cy] = p(9, -5);
      this.add(`<polygon points="${x2},${y2} ${ax},${ay} ${bx},${by} ${cx},${cy}" fill="#000" stroke="#000"/>`);
    }
    return this;
  }
  ellipse(cx, cy, rx, ry, lines) {
    this.add(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" stroke="#000" stroke-width="1.3"/>`);
    const y0 = cy - ((lines.length - 1) * 8) + 5;
    lines.forEach((l, i) => this.text(cx, y0 + i * 16, l, { anchor: 'middle' }));
    return this;
  }
  actor(x, y, name) {
    this.add(`<circle cx="${x}" cy="${y}" r="10" fill="#fff" stroke="#000" stroke-width="1.3"/>`);
    this.line(x, y + 10, x, y + 40).line(x - 18, y + 22, x + 18, y + 22).line(x, y + 40, x - 14, y + 62).line(x, y + 40, x + 14, y + 62);
    name.split('\n').forEach((l, i) => this.text(x, y + 80 + i * 14, l, { anchor: 'middle', bold: true }));
    return this;
  }
  save(file) {
    const body = this.parts.join('\n');
    writeFileSync(path.join(OUT, file), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.w} ${this.h}" width="${this.w}" height="${this.h}" font-family="Arial, Helvetica, sans-serif" fill="#000">\n${body}\n</svg>\n`);
  }
}

// ---------------------------------------------------------------- Casos de uso
function useCases() {
  const s = new Svg(760, 500);
  s.rect(120, 15, 520, 475).text(380, 38, 'Sinfonía Retail', { anchor: 'middle', bold: true, size: 14 });
  const UC = { catalog: [250, 90], order: [250, 200], status: [250, 305], health: [250, 385], chaos: [250, 450], stock: [545, 125], pay: [545, 220], comp: [545, 315] };
  const rx = 100, rx2 = 85, ry = 28;
  s.ellipse(...UC.catalog, rx, ry, ['Consultar catálogo']);
  s.ellipse(...UC.order, rx, ry, ['Crear pedido']);
  s.ellipse(...UC.status, rx, ry, ['Consultar estado', 'del pedido']);
  s.ellipse(...UC.health, rx, ry, ['Monitorear salud', 'y métricas']);
  s.ellipse(...UC.chaos, rx, ry, ['Inyectar fallos', 'en pagos']);
  s.ellipse(...UC.stock, rx2, ry, ['Reservar inventario']);
  s.ellipse(...UC.pay, rx2, ry, ['Procesar pago']);
  s.ellipse(...UC.comp, rx2, ry, ['Compensar y', 'cancelar pedido']);
  s.actor(55, 150, 'Cliente');
  s.actor(55, 370, 'Administrador');
  s.actor(705, 180, 'Pasarela\nde pagos');
  for (const k of ['catalog', 'order', 'status']) s.line(73, 172, UC[k][0] - rx + 3, UC[k][1]);
  for (const k of ['health', 'chaos']) s.line(73, 392, UC[k][0] - rx + 3, UC[k][1]);
  s.line(687, 202, UC.pay[0] + rx2, UC.pay[1]);
  s.line(UC.order[0] + 90, UC.order[1] - 14, UC.stock[0] - 80, UC.stock[1] + 10, { dashed: true, arrow: 'open' }).label(405, 160, '«include»');
  s.line(UC.order[0] + 98, UC.order[1] + 5, UC.stock[0] - 85, UC.pay[1] - 3, { dashed: true, arrow: 'open' }).label(405, 222, '«include»');
  s.line(UC.comp[0] - 80, UC.comp[1] - 16, UC.order[0] + 75, UC.order[1] + 25, { dashed: true, arrow: 'open' }).label(405, 285, '«extend»');
  s.save('01-casos-de-uso.svg');
}

// --------------------------------------------------------------------- Clases
function classBox(s, x, y, w, name, attrs, ops) {
  const lh = 17;
  const hAttr = Math.max(attrs.length, 1) * lh + 10;
  const hOps = Math.max(ops.length, 1) * lh + 10;
  const head = 28;
  const h = head + hAttr + hOps;
  s.rect(x, y, w, h);
  s.text(x + w / 2, y + head - 9, name, { anchor: 'middle', bold: true });
  s.line(x, y + head, x + w, y + head).line(x, y + head + hAttr, x + w, y + head + hAttr);
  attrs.forEach((a, i) => s.text(x + 6, y + head + 17 + i * lh - 3, a, { size: 12 }));
  ops.forEach((o, i) => s.text(x + 6, y + head + hAttr + 17 + i * lh - 3, o, { size: 12 }));
  return { x, y, w, h };
}

function classes() {
  const s = new Svg(760, 540);
  const W = 160;
  const C = [8, 201, 394, 587];
  const gw = classBox(s, C[0], 190, W, 'ApiGateway', ['-limiter: RateLimiter'], ['+route(request)', '+health()']);
  const cat = classBox(s, C[1], 10, W, 'CatalogService', ['-db: Map', '-reservations: Map'], ['+list()', '+get(id)', '+reserve(id, qty)', '+release(id)']);
  const cache = classBox(s, C[2], 10, W, 'CacheAside', ['-ttlMs: int', '-entries: Map'], ['+get(key, loader)', '+invalidate(key)']);
  const prod = classBox(s, C[3], 10, W, 'Product', ['+id: String', '+name: String', '+price: int', '+stock: int'], ['+hasStock(qty)']);
  const ord = classBox(s, C[1], 190, W, 'OrderService', ['-orders: Map', '-paymentsBreaker'], ['+createOrder(dto)', '+getOrder(id)', '-runSaga(order)', '-compensate(order)']);
  const wq = classBox(s, C[2], 190, W, 'WorkQueue', ['-pending: Order[]', '-workers: int'], ['+enqueue(job)', '+stats()']);
  const cb = classBox(s, C[3], 190, W, 'CircuitBreaker', ['-state: Estado', '-failures: int', '-threshold: int'], ['+exec(fn)', '+snapshot()']);
  const o = classBox(s, C[1], 390, W, 'Order', ['+id: UUID', '+status: Estado', '+total: int'], ['+setStatus(estado)']);
  const oi = classBox(s, C[2], 390, W, 'OrderItem', ['+productId: String', '+qty: int'], []);
  const pay = classBox(s, C[0], 390, W, 'PaymentService', ['-failureRate: float', '-processed: Map'], ['+charge(monto, key)', '+setChaos(rate)']);

  s.poly([[gw.x + 80, gw.y], [gw.x + 80, 60], [cat.x, 60]], { arrow: 'open' });
  s.line(gw.x + W, 235, ord.x, 235, { arrow: 'open' });
  s.line(gw.x + 80, gw.y + gw.h, pay.x + 80, pay.y, { arrow: 'open' });
  s.line(cat.x + W, 60, cache.x, 60, { start: 'diamond' }).text(cache.x - 12, 52, '1', { size: 11 });
  s.line(cat.x + W, 132, prod.x, 132, { start: 'diamond' }).text(prod.x - 30, 124, '0..*', { size: 11 });
  s.line(ord.x + W, 235, wq.x, 235, { start: 'diamond' }).text(wq.x - 12, 227, '1', { size: 11 });
  s.line(ord.x + W, 315, cb.x, 315, { start: 'diamond' }).text(cb.x - 12, 307, '1', { size: 11 });
  s.line(ord.x + 80, ord.y + ord.h, o.x + 80, o.y, { start: 'diamond' }).text(o.x + 88, o.y - 8, '0..*', { size: 11 });
  s.line(o.x + W, 440, oi.x, 440, { start: 'diamond' }).text(oi.x - 30, 432, '1..*', { size: 11 });
  s.text(380, 525, 'Rombo relleno: composición. Flecha abierta: dependencia de uso.', { anchor: 'middle', size: 12, italic: true });
  s.save('02-clases.svg');
}

// ------------------------------------------------------------------ Secuencia
function sequence() {
  const s = new Svg(760, 700);
  const P = [['Cliente', 60], ['API Gateway', 180], ['Orders', 300], ['Cola', 420], ['Catálogo', 540], ['Pagos', 690]];
  const X = Object.fromEntries(P);
  for (const [name, x] of P) {
    s.rect(x - 52, 10, 104, 28).text(x, 29, name, { anchor: 'middle', bold: true });
    s.line(x, 38, x, 680, { dashed: true });
  }
  let y = 68;
  const msg = (from, to, text, { ret = false, gap = 34 } = {}) => {
    s.line(X[from], y, X[to], y, { dashed: ret, arrow: ret ? 'open' : 'solid' });
    const cx = (X[from] + X[to]) / 2;
    s.add(`<rect x="${cx - text.length * 3.3 - 3}" y="${y - 19}" width="${text.length * 6.6 + 6}" height="16" fill="#fff" stroke="none"/>`);
    s.text(cx, y - 6, text, { anchor: 'middle', size: 12 });
    y += gap;
  };
  const self = (who, text) => {
    const x = X[who];
    s.poly([[x, y], [x + 36, y], [x + 36, y + 18], [x, y + 18]], { arrow: 'solid' });
    s.text(x + 42, y + 13, text, { size: 12 });
    y += 40;
  };
  msg('Cliente', 'API Gateway', 'POST /api/orders');
  msg('API Gateway', 'Orders', 'POST /orders');
  msg('Orders', 'Cola', 'enqueue(pedido)');
  msg('Orders', 'API Gateway', '202 Accepted', { ret: true });
  msg('API Gateway', 'Cliente', '202 + id', { ret: true, gap: 40 });
  msg('Cola', 'Orders', 'toma el pedido');
  msg('Orders', 'Catálogo', 'POST reserve(producto, qty)');
  msg('Catálogo', 'Orders', 'precio y reserva OK', { ret: true, gap: 38 });
  msg('Orders', 'Pagos', 'POST /payments [Retry + Breaker]', { gap: 28 });
  const top = y - 6;
  const left = 240, right = 745;
  y += 12;
  s.text(left + 54, y, '[pago aprobado]', { size: 12, bold: true });
  y += 26;
  msg('Pagos', 'Orders', '200 APPROVED', { ret: true, gap: 36 });
  self('Orders', 'estado = CONFIRMED');
  s.line(left, y - 6, right, y - 6, { dashed: true });
  y += 12;
  s.text(left + 54, y, '[rechazo 402, fallo 503 o circuito abierto]', { size: 12, bold: true });
  y += 26;
  msg('Pagos', 'Orders', 'error de pago', { ret: true, gap: 36 });
  msg('Orders', 'Catálogo', 'POST release(producto)', { gap: 36 });
  self('Orders', 'estado = CANCELLED');
  const bottom = y - 8;
  s.add(`<rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" fill="none" stroke="#000" stroke-width="1.3"/>`);
  s.add(`<polygon points="${left},${top} ${left + 44},${top} ${left + 44},${top + 12} ${left + 36},${top + 20} ${left},${top + 20}" fill="#fff" stroke="#000" stroke-width="1.3"/>`);
  s.text(left + 6, top + 14, 'alt', { bold: true, size: 12 });
  y += 10;
  msg('Cliente', 'API Gateway', 'GET /orders/{id}', { gap: 30 });
  msg('API Gateway', 'Cliente', '200 {estado}', { ret: true });
  s.h = y + 10;
  s.save('03-secuencia.svg');
}

// --------------------------------------------------------------- Despliegue
function node3d(s, x, y, w, h, stereotype, name, lines = [], dashed = false) {
  const d = 9;
  const dash = dashed ? ' stroke-dasharray="6 4"' : '';
  s.add(`<polygon points="${x},${y} ${x + d},${y - d} ${x + w + d},${y - d} ${x + w},${y}" fill="#fff" stroke="#000" stroke-width="1.3"${dash}/>`);
  s.add(`<polygon points="${x + w},${y} ${x + w + d},${y - d} ${x + w + d},${y + h - d} ${x + w},${y + h}" fill="#fff" stroke="#000" stroke-width="1.3"${dash}/>`);
  s.rect(x, y, w, h, { dashed });
  s.text(x + w / 2, y + 20, stereotype, { anchor: 'middle', size: 12 });
  s.text(x + w / 2, y + 38, name, { anchor: 'middle', bold: true });
  lines.forEach((l, i) => s.text(x + w / 2, y + 58 + i * 16, l, { anchor: 'middle', size: 12 }));
}

function deployment() {
  const s = new Svg(760, 490);
  s.rect(165, 18, 590, 455, { rx: 6 }).text(178, 40, '«cloud»  Plataforma de contenedores gestionada (p. ej., Cloud Run)', { bold: true });
  node3d(s, 10, 205, 120, 90, '«device»', 'Navegador', ['Panel HTML/JS']);
  node3d(s, 190, 205, 140, 90, '«container»', 'gateway', ['Node.js 22 · :8080', 'API Gateway']);
  node3d(s, 400, 70, 140, 90, '«container»', 'catalog', ['Node.js 22 · :4001', 'Cache-Aside']);
  node3d(s, 400, 205, 140, 90, '«container»', 'orders', ['Node.js 22 · :4002', 'Cola, Saga, Breaker']);
  node3d(s, 400, 340, 140, 90, '«container»', 'payments', ['Node.js 22 · :4003', 'Idempotencia']);
  node3d(s, 600, 70, 140, 90, '«evolución»', 'Caché gestionada', ['p. ej., Redis'], true);
  node3d(s, 600, 205, 140, 90, '«evolución»', 'Broker de mensajes', ['p. ej., Pub/Sub'], true);
  node3d(s, 600, 340, 140, 90, '«evolución»', 'Pasarela de pagos', ['proveedor externo'], true);
  s.line(130, 250, 190, 250, { arrow: 'open', start: 'open' }).label(160, 242, 'HTTPS', { size: 11 });
  s.line(330, 240, 400, 115, { arrow: 'open' });
  s.line(330, 250, 400, 250, { arrow: 'open' });
  s.line(330, 260, 400, 385, { arrow: 'open' });
  s.label(365, 200, 'HTTP', { size: 11 });
  s.line(470, 205, 470, 160, { arrow: 'open' }).label(500, 187, 'reserve', { size: 11 });
  s.line(470, 295, 470, 340, { arrow: 'open' }).label(496, 322, 'charge', { size: 11 });
  s.line(540, 115, 600, 115, { dashed: true });
  s.line(540, 250, 600, 250, { dashed: true });
  s.line(540, 385, 600, 385, { dashed: true });
  s.text(745, 462, 'Línea discontinua: evolución prevista, no implementada.', { anchor: 'end', size: 12, italic: true });
  s.save('04-despliegue.svg');
}

useCases();
classes();
sequence();
deployment();
console.log('Diagramas generados en', OUT);
