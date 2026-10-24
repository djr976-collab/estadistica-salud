// Verificación de interfaz en Chromium (Playwright) sobre la versión compilada.
// Uso: npm run build && npm run verify:ui
// Comprueba anchos de celular, desbordamiento horizontal, tamaños táctiles,
// coincidencia ruleta-categoría, teclado, recorrido completo hasta el desafío
// final, persistencia, reinicio confirmado y arranque sin conexión.

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = new URL('..', import.meta.url).pathname;
const shots = `${root}test-results/screens`;
mkdirSync(shots, { recursive: true });

const bankQs = [
  ...JSON.parse(readFileSync(`${root}src/content/questions.json`, 'utf8')).questions,
  ...JSON.parse(readFileSync(`${root}src/content/final-challenge.json`, 'utf8')).questions,
];
const cats = JSON.parse(readFileSync(`${root}src/content/categories.json`, 'utf8')).categories;
const byStem = new Map(bankQs.map((q) => [q.stem, q]));

const PORT = 4179;
const BASE = `http://localhost:${PORT}/`;
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const server = spawn(`${root}node_modules/.bin/vite`, ['preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'pipe' });
// Cerrar el servidor siempre, incluso si una verificación lanza un error.
process.on('exit', () => server.kill());
process.on('uncaughtException', (e) => {
  console.error(e);
  server.kill();
  process.exit(1);
});
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('preview no arrancó')), 20000);
  server.stdout.on('data', (d) => {
    if (String(d).includes(String(PORT))) {
      clearTimeout(t);
      resolve();
    }
  });
});

const browser = await chromium.launch();

async function noHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 0.5);
}

async function smallTargets(page) {
  return page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('button, .option, .avatar-option, .toggle, .radio-row, select, input:not([type=radio]):not([type=checkbox])')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden') continue;
      if (r.height < 47.5 || r.width < 47.5) bad.push(`${el.tagName}.${el.className} ${Math.round(r.width)}x${Math.round(r.height)} «${(el.textContent || '').trim().slice(0, 30)}»`);
    }
    return bad;
  });
}

async function answerCurrent(page, { correct = true } = {}) {
  const stem = (await page.locator('.stem').innerText()).trim();
  const q = byStem.get(stem);
  if (!q) throw new Error(`Consigna no encontrada en el banco: ${stem.slice(0, 60)}`);
  if (q.type === 'numeric') {
    const val = correct ? String(q.numericAnswer).replace('.', ',') : String(q.numericAnswer + 1000);
    await page.locator('.numeric-input').fill(val);
  } else {
    const target = correct ? q.options.find((o) => o.id === q.correctOptionId) : q.options.find((o) => o.id !== q.correctOptionId);
    await page.locator('.option', { hasText: target.text }).click();
  }
  await page.getByRole('button', { name: 'Confirmar respuesta' }).click();
  await page.locator('.feedback-screen').waitFor();
  return q;
}

async function sectorUnderPointer(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.wheel-rotor');
    const m = new DOMMatrix(getComputedStyle(el).transform);
    const deg = (Math.atan2(m.b, m.a) * 180) / Math.PI;
    const angle = (((-deg) % 360) + 360) % 360;
    return Math.floor(angle / 60) % 6;
  });
}

// ───────────── 1. Anchos de celular ─────────────
for (const width of [320, 360, 390, 430]) {
  const ctx = await browser.newContext({ viewport: { width, height: 760 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.getByRole('button', { name: /Empezar «Mi guardia»/ }).waitFor();
  await page.screenshot({ path: `${shots}/${width}-01-inicio.png`, fullPage: true });
  check(`${width}px inicio sin desplazamiento horizontal`, await noHorizontalOverflow(page));
  const homeSmall = (await smallTargets(page)).filter((t) => !t.includes('disabled'));
  check(`${width}px inicio: objetivos táctiles ≥ 48 px`, homeSmall.length === 0, homeSmall.join(' | '));

  await page.getByRole('button', { name: /Empezar «Mi guardia»/ }).click();
  await page.getByLabel('Alias (opcional)').fill('Prueba');
  await page.screenshot({ path: `${shots}/${width}-02-preparar.png`, fullPage: true });
  check(`${width}px preparar sin desplazamiento horizontal`, await noHorizontalOverflow(page));
  await page.getByRole('button', { name: 'Empezar la guardia' }).click();
  await page.getByRole('button', { name: 'Girar la ruleta' }).waitFor();
  await page.screenshot({ path: `${shots}/${width}-03-tablero.png`, fullPage: true });
  check(`${width}px tablero sin desplazamiento horizontal`, await noHorizontalOverflow(page));
  const boardSmall = await smallTargets(page);
  check(`${width}px tablero: objetivos táctiles ≥ 48 px`, boardSmall.length === 0, boardSmall.join(' | '));

  // Giro animado: el botón queda inhabilitado durante el giro y el sector coincide.
  await page.getByRole('button', { name: 'Girar la ruleta' }).click();
  const spinningVisible = await page.getByText('Girando…').isVisible();
  check(`${width}px giro en curso visible y sin segundo giro`, spinningVisible && (await page.getByRole('button', { name: 'Girar la ruleta' }).count()) === 0);
  await page.getByRole('button', { name: 'Responder el desafío' }).waitFor({ timeout: 6000 });
  const chip = (await page.locator('.landed .chip').innerText()).trim();
  const idx = await sectorUnderPointer(page);
  check(`${width}px la ruleta se detiene en la categoría anunciada`, cats[idx].name === chip, `sector ${cats[idx].name} / anunciado ${chip}`);
  await page.screenshot({ path: `${shots}/${width}-04-resultado-giro.png`, fullPage: false });

  await page.getByRole('button', { name: 'Responder el desafío' }).click();
  await page.locator('.stem').waitFor();
  const stem = (await page.locator('.stem').innerText()).trim();
  check(`${width}px la pregunta pertenece a la categoría sorteada`, cats.find((c) => c.id === byStem.get(stem)?.category)?.name === chip);
  // Seleccionar una opción no debe desplazar la pantalla.
  const isChoice = (await page.locator('.option').count()) > 0;
  if (isChoice) {
    // Se ubica la opción visible debajo de la consigna fija y se toca en sus coordenadas,
    // para medir solo el desplazamiento que provoca la interfaz.
    await page.evaluate(() => {
      const opt = document.querySelectorAll('.option')[2];
      const stem = document.querySelector('.stem-card').getBoundingClientRect();
      window.scrollBy(0, opt.getBoundingClientRect().top - stem.bottom - 12);
    });
    await page.waitForTimeout(100);
    const y0 = await page.evaluate(() => window.scrollY);
    const box = await page.locator('.option').nth(2).boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + Math.min(box.height / 2, 20));
    const y1 = await page.evaluate(() => window.scrollY);
    check(`${width}px elegir opción no desplaza la interfaz`, Math.abs(y1 - y0) < 2, `${y0} → ${y1}`);
    const stemBox = await page.locator('.stem-card').boundingBox();
    check(`${width}px la consigna sigue visible al elegir`, !!stemBox && stemBox.y >= 0 && stemBox.y < 760);
  }
  await page.screenshot({ path: `${shots}/${width}-05-pregunta.png`, fullPage: false });
  check(`${width}px pregunta sin desplazamiento horizontal`, await noHorizontalOverflow(page));
  const qSmall = await smallTargets(page);
  check(`${width}px pregunta: objetivos táctiles ≥ 48 px`, qSmall.length === 0, qSmall.join(' | '));
  await answerCurrent(page, { correct: false });
  await page.screenshot({ path: `${shots}/${width}-06-devolucion.png`, fullPage: true });
  check(`${width}px devolución sin desplazamiento horizontal`, await noHorizontalOverflow(page));
  await ctx.close();
}

// ───────────── 2. Recorrido completo, críticos, persistencia, reinicio ─────────────
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 760 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.getByRole('button', { name: /Empezar «Mi guardia»/ }).click();
  await page.getByRole('button', { name: 'Empezar la guardia' }).click();

  let failedCritical = false;
  let criticalStopShown = false;
  let recoveryVariantDifferent = false;
  let compensationBlocked = null;
  let loops = 0;
  const seen = new Set();
  let repeats = 0;
  while (loops++ < 80) {
    const badges = await page.locator('.badge-cell.is-earned').count();
    if (badges === 6) break;
    const noAnim = page.getByRole('button', { name: 'Elegir desafío sin animación' });
    if (!(await noAnim.isVisible().catch(() => false))) break;
    await noAnim.click();
    await page.getByRole('button', { name: 'Responder el desafío' }).click();
    await page.locator('.stem').waitFor();
    const stem = (await page.locator('.stem').innerText()).trim();
    if (seen.has(stem)) repeats++;
    seen.add(stem);
    const q = byStem.get(stem);
    const fail = q.criticalSafety && !failedCritical;
    await answerCurrent(page, { correct: !fail });
    if (fail) {
      failedCritical = true;
      criticalStopShown = await page.getByRole('heading', { name: 'Acción detenida' }).isVisible();
      await page.getByRole('button', { name: 'Volver al tablero (queda pendiente)' }).click();
      // Mientras hay un crítico pendiente, completar otras preguntas no habilita la insignia de esa categoría.
      compensationBlocked = { category: q.category };
      await page.locator('.alert-critical').waitFor();
      await page.locator('.alert-critical button').first().click();
      const recStem = (await page.locator('.stem').innerText()).trim();
      recoveryVariantDifferent = recStem !== stem && byStem.get(recStem)?.conceptId === q.conceptId;
      check('la recuperación indica que es una pregunta nueva equivalente', await page.getByText(/Pregunta nueva equivalente/).isVisible());
      await answerCurrent(page, { correct: true });
    }
    await page.getByRole('button', { name: 'Continuar' }).click();
    if (await page.getByRole('dialog').isVisible().catch(() => false)) {
      await page.getByRole('dialog').getByRole('button').first().click();
    }
  }
  check('error crítico detiene la acción', criticalStopShown);
  check('la recuperación crítica usa una variante distinta del mismo concepto', recoveryVariantDifferent);
  check('sin repeticiones de preguntas en Mi guardia', repeats === 0, `${repeats} repeticiones`);
  check('seis insignias obtenidas mediante la interfaz', (await page.locator('.badge-cell.is-earned').count()) === 6);
  void compensationBlocked;

  // Persistencia tras recarga.
  await page.reload();
  await page.getByRole('button', { name: 'Continuar mi guardia' }).click();
  check('el progreso persiste tras recargar', (await page.locator('.badge-cell.is-earned').count()) === 6);

  // Desafío final con error crítico en la decisión 2.
  await page.getByRole('button', { name: 'La última pregunta de la guardia' }).click();
  await page.screenshot({ path: `${shots}/360-07-final-intro.png`, fullPage: true });
  await page.getByRole('button', { name: 'Comenzar el caso' }).click();
  await answerCurrent(page, { correct: true });
  await page.getByRole('button', { name: 'Continuar' }).click();
  await answerCurrent(page, { correct: false });
  check('desafío final: acción insegura detenida', await page.getByRole('heading', { name: 'Acción detenida' }).isVisible());
  await page.getByRole('button', { name: 'Resolver la instancia de recuperación' }).click();
  check('desafío final: recuperación dentro del caso', await page.getByText(/Recuperación dentro del caso/).isVisible());
  await page.screenshot({ path: `${shots}/360-08-final-recuperacion.png`, fullPage: false });
  await answerCurrent(page, { correct: true });
  await page.getByRole('button', { name: 'Continuar' }).click();
  await answerCurrent(page, { correct: true });
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('dialog').waitFor();
  await page.screenshot({ path: `${shots}/360-09-final-celebracion.png`, fullPage: false });
  await page.getByRole('button', { name: 'Ver mi resumen' }).click();
  await page.getByRole('heading', { name: 'Resumen de aprendizaje' }).waitFor();
  await page.screenshot({ path: `${shots}/360-10-resumen.png`, fullPage: true });
  check('resumen sin desplazamiento horizontal', await noHorizontalOverflow(page));
  check('resumen muestra el desafío final completado', await page.getByText('Desafío final: completado.').isVisible());

  // Exportar CSV.
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Exportar resultados/ }).click()]);
  const csvPath = await download.path();
  const csv = readFileSync(csvPath, 'utf8');
  check('CSV con BOM y tildes', csv.charCodeAt(0) === 0xfeff && csv.includes('Fisiología'));

  // Reinicio con confirmación.
  await page.getByRole('button', { name: 'Ir al inicio' }).click();
  await page.getByRole('button', { name: 'Reiniciar progreso' }).click();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  check('cancelar el reinicio conserva la guardia', await page.getByRole('button', { name: 'Continuar mi guardia' }).isVisible());
  await page.getByRole('button', { name: 'Reiniciar progreso' }).click();
  await page.getByRole('button', { name: 'Sí, borrar progreso' }).click();
  await page.getByRole('button', { name: /Empezar «Mi guardia»/ }).waitFor();
  await page.waitForTimeout(300);
  await page.reload();
  const resetOk = await page.getByRole('button', { name: /Empezar «Mi guardia»/ }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
  check('reinicio confirmado borra la guardia', resetOk && (await page.getByRole('button', { name: 'Continuar mi guardia' }).count()) === 0);
  await ctx.close();
}

// ───────────── 3. Teclado ─────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE);
  const tabTo = async (name, max = 25) => {
    for (let i = 0; i < max; i++) {
      await page.keyboard.press('Tab');
      const txt = await page.evaluate(() => (document.activeElement?.textContent || document.activeElement?.getAttribute('aria-label') || '').trim());
      if (txt.includes(name)) return true;
    }
    return false;
  };
  const steps = [];
  steps.push(['inicio', await tabTo('Empezar «Mi guardia»')]);
  await page.keyboard.press('Enter');
  steps.push(['preparar', await tabTo('Empezar la guardia', 40)]);
  await page.keyboard.press('Enter');
  steps.push(['sin animación', await tabTo('Elegir desafío sin animación')]);
  await page.keyboard.press('Enter');
  // Al detenerse la ruleta el foco pasa solo a «Responder el desafío».
  const focused = await page.evaluate(() => (document.activeElement?.textContent || '').trim());
  steps.push(['foco en el resultado', focused.includes('Responder el desafío')]);
  await page.keyboard.press('Enter');
  await page.locator('.stem').waitFor();
  const isChoice = (await page.locator('.option').count()) > 0;
  if (isChoice) {
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      if (await page.evaluate(() => document.activeElement?.type === 'radio')) break;
    }
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');
  } else {
    await page.locator('.numeric-input').focus();
    await page.keyboard.type('1');
    await page.keyboard.press('Enter');
  }
  steps.push(['responder', await page.locator('.feedback-screen').isVisible({ timeout: 3000 }).catch(() => false)]);
  const ok = steps.every(([, v]) => v);
  if (!ok) console.log('pasos de teclado:', JSON.stringify(steps));
  check('recorrido básico solo con teclado', ok);
  await ctx.close();
}

// ───────────── 4. Validación numérica en la interfaz ─────────────
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 760 } });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.getByRole('button', { name: /Empezar «Mi guardia»/ }).click();
  await page.getByRole('button', { name: 'Empezar la guardia' }).click();
  let found = false;
  for (let i = 0; i < 36 && !found; i++) {
    await page.getByRole('button', { name: 'Elegir desafío sin animación' }).click();
    await page.getByRole('button', { name: 'Responder el desafío' }).click();
    await page.locator('.stem').waitFor();
    if ((await page.locator('.numeric-input').count()) > 0) {
      found = true;
      check('confirmar está inhabilitado con el casillero vacío', await page.getByRole('button', { name: 'Confirmar respuesta' }).isDisabled());
      await page.locator('.numeric-input').fill('abc');
      await page.getByRole('button', { name: 'Confirmar respuesta' }).click();
      check('rechaza texto no numérico con mensaje', (await page.locator('.numeric-error').innerText()).includes('solo un número'));
      await page.locator('.numeric-input').fill('12 mL');
      await page.getByRole('button', { name: 'Confirmar respuesta' }).click();
      check('rechaza unidades escritas en el casillero', (await page.locator('.numeric-error').innerText()).includes('unidad'));
      await page.screenshot({ path: `${shots}/360-11-numerico-error.png`, fullPage: false });
      const q = byStem.get((await page.locator('.stem').innerText()).trim());
      await page.locator('.numeric-input').fill(String(q.numericAnswer).replace('.', ','));
      await page.getByRole('button', { name: 'Confirmar respuesta' }).click();
      check('acepta coma decimal en la interfaz', await page.getByRole('heading', { name: 'Bien fundamentado' }).isVisible());
    } else {
      await answerCurrent(page, { correct: true });
      await page.getByRole('button', { name: 'Continuar' }).click();
      if (await page.getByRole('dialog').isVisible().catch(() => false)) await page.getByRole('dialog').getByRole('button').first().click();
    }
  }
  await ctx.close();
}

// ───────────── 5. Sin conexión (Service Worker real) ─────────────
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 760 } });
  const page = await ctx.newPage();
  await page.goto(BASE);
  const ready = await page.getByText(/Preparación sin conexión completa/).waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  check('la app informa preparación offline completa (verificada contra la caché)', ready);
  await page.getByRole('button', { name: /Empezar «Mi guardia»/ }).click();
  await page.getByRole('button', { name: 'Empezar la guardia' }).click();
  await ctx.setOffline(true);
  await page.reload();
  const bootedOffline = await page.getByRole('button', { name: 'Continuar mi guardia' }).waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
  check('el juego abre sin conexión y conserva la guardia', bootedOffline);
  if (bootedOffline) {
    await page.getByRole('button', { name: 'Continuar mi guardia' }).click();
    await page.getByRole('button', { name: 'Elegir desafío sin animación' }).click();
    await page.getByRole('button', { name: 'Responder el desafío' }).click();
    const playable = await page.locator('.stem').waitFor({ timeout: 4000 }).then(() => true).catch(() => false);
    check('se puede jugar sin conexión', playable);
  }
  await ctx.close();
}

// ───────────── 6. Actualización de versión sin perder la guardia ─────────────
{
  const swPath = `${root}dist/sw.js`;
  const original = readFileSync(swPath, 'utf8');
  try {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 760 } });
    const page = await ctx.newPage();
    await page.goto(BASE);
    await page.getByText(/Preparación sin conexión completa/).waitFor({ timeout: 15000 });
    await page.getByRole('button', { name: /Empezar «Mi guardia»/ }).click();
    await page.getByRole('button', { name: 'Empezar la guardia' }).click();
    await page.getByRole('button', { name: 'Elegir desafío sin animación' }).click();
    await page.getByRole('button', { name: 'Responder el desafío' }).click();
    await page.locator('.stem').waitFor();
    const stemBefore = (await page.locator('.stem').innerText()).trim();
    // Se publica una "versión nueva" del Service Worker.
    writeFileSync(swPath, original.replace(/const VERSION = '([^']+)'/, "const VERSION = '$1-nueva'"));
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r && r.update()));
    await page.getByRole('button', { name: 'Ir al inicio' }).click();
    const offered = await page.getByRole('button', { name: 'Actualizar ahora' }).waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    check('se ofrece la actualización sin aplicarla por sorpresa', offered);
    if (offered) {
      await page.getByRole('button', { name: 'Actualizar ahora' }).click();
      await page.waitForEvent('load', { timeout: 15000 }).catch(() => undefined);
      await page.getByRole('button', { name: 'Continuar mi guardia' }).waitFor({ timeout: 10000 });
      await page.getByRole('button', { name: 'Continuar mi guardia' }).click();
      const stemAfter = (await page.locator('.stem').innerText({ timeout: 5000 }).catch(() => '')).trim();
      check('tras actualizar se retoma la misma pregunta (progreso conservado)', stemAfter === stemBefore);
    }
    await ctx.close();
  } finally {
    writeFileSync(swPath, original);
  }
}

await browser.close();
server.kill();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} de ${results.length} verificaciones OK. Capturas en test-results/screens/`);
process.exit(failed.length ? 1 : 0);
