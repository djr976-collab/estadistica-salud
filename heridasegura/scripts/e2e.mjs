// Prueba end-to-end del flujo prioritario en MODO DEMO (sin Supabase), viewport de celular.
// Uso: npm run build && (npx next start -p 3100 &) && node scripts/e2e.mjs
// Variables: BASE_URL (por defecto http://localhost:3100), SHOTS=dir para capturas.
import { chromium } from './pw.mjs';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
const SHOTS = process.env.SHOTS ?? 'test-results/e2e';
mkdirSync(SHOTS, { recursive: true });
let step = 0;
const ok = (m) => console.log(`  ✓ ${m}`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-AR', isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (name) => page.screenshot({ path: `${SHOTS}/${String(++step).padStart(2, '0')}-${name}.png`, fullPage: true });

// Imagen sintética (NO es una herida real): patrón geométrico para probar la carga.
const img = await browser.newPage({ viewport: { width: 1280, height: 960 } });
await img.setContent(`<body style="margin:0;background:#d9b8a6"><div style="position:absolute;left:420px;top:300px;width:440px;height:330px;border-radius:50%;background:radial-gradient(#b5443a,#e3a08f);"></div>
  <div style="position:absolute;left:100px;top:820px;width:600px;height:40px;background:repeating-linear-gradient(90deg,#111 0 2px,#fff 2px 60px)"></div></body>`);
const imgPath = `${SHOTS}/foto-sintetica.png`;
await img.screenshot({ path: imgPath });
await img.close();

try {
  console.log('1. Inicio de sesión (enfermería CQ Sector 4)');
  await page.goto(`${BASE}/login`);
  await page.getByRole('button', { name: 'Enfermería CQ Sector 4 (demo)' }).click();
  await page.waitForURL(`${BASE}/`);
  await page.getByRole('heading', { name: /Hola/ }).waitFor();
  await shot('inicio'); ok('sesión iniciada');

  console.log('2. Clínica Quirúrgica → Sector 4 → Habitación 30 → Cama B');
  await page.goto(`${BASE}/servicios`);
  await page.getByRole('heading', { name: 'Clínica Quirúrgica' }).waitFor();
  await page.getByRole('link', { name: /Clínica Quirúrgica — Sector 4/ }).click();
  await page.getByRole('heading', { name: 'Habitación 30' }).waitFor();
  const tiles = await page.locator('a[aria-label^="Cama de internación"]').count();
  if (tiles !== 30) throw new Error(`Sector 4 debería mostrar 30 camas, muestra ${tiles}`);
  for (const absent of ['36A', '37A']) if (await page.getByText(absent, { exact: true }).count()) throw new Error(`No debería existir ${absent}`);
  await shot('sector4'); ok('30 camas visibles, sin habitaciones 36/37');
  await page.locator('a[aria-label^="Cama de internación 30B"]').click();
  await page.getByText('Paciente asignado').waitFor();
  await shot('cama-30B'); ok('cama 30B ocupada por paciente ficticio');

  console.log('3. Ficha del paciente');
  await page.getByRole('link', { name: /Abrir ficha del paciente/ }).click();
  await page.getByRole('heading', { name: /Ficticia Gómez, Rosa/ }).waitFor();
  await shot('ficha'); ok('ficha abierta');

  console.log('4. Registrar lesión por presión en sacro');
  await page.getByRole('link', { name: /Registrar nueva lesión/ }).click();
  await page.getByLabel('Tipo de lesión').selectOption('lesion_por_presion');
  await page.getByRole('button', { name: 'Sacro (posterior)' }).click();
  await page.getByRole('radio', { name: 'No, adquirida en internación' }).click();
  await page.getByLabel('Fuente verificable').fill('Valoración de piel al ingreso sin lesiones (ficticio)');
  await shot('lesion-nueva');
  await page.getByRole('button', { name: /Guardar y continuar/ }).click();
  await page.getByRole('heading', { name: /Valoración · L-/ }).waitFor();
  ok('lesión registrada');

  console.log('5. Valoración inicial con fotografía');
  await page.locator('input[type=file]:not([capture])').setInputFiles(imgPath);
  await page.getByText(/Calidad técnica/).waitFor();
  await page.getByText(/NO muestra rostro/).click();
  // Estadio 1 bloqueado sin eritema no blanqueable
  await page.getByRole('radio', { name: 'No aplica (piel no intacta)' }).click();
  await page.getByRole('button', { name: /Estadio 2 — Pérdida parcial/ }).click();
  await page.getByText(/Confirmo que la categoría seleccionada/).click();
  await page.getByLabel('Largo (cm)').fill('4');
  await page.getByLabel('Ancho (cm)').fill('3');
  await page.getByLabel('Exudado: cantidad').selectOption('escaso');
  await page.getByLabel('Evolución observada').selectOption('primera_valoracion');
  await page.getByText('Cambios de posición', { exact: true }).click();
  await page.getByText('Modo de valoración manual asistida').waitFor();
  await shot('valoracion');
  await page.getByRole('button', { name: 'Confirmar valoración' }).click();
  await page.getByText('Línea de tiempo de valoraciones').waitFor();
  await page.getByText(/12 cm²/).first().waitFor();
  await shot('evolucion-1'); ok('valoración inicial confirmada (12 cm²) con foto');

  console.log('6. Seguimiento: no se permite estadificación inversa');
  await page.getByRole('link', { name: /Nueva valoración de seguimiento/ }).click();
  await page.getByRole('heading', { name: /Valoración · L-/ }).waitFor();
  const e1disabled = await page.getByRole('button', { name: /Estadio 1 — Eritema/ }).isDisabled();
  if (!e1disabled) throw new Error('Estadio 1 debería estar deshabilitado tras estadio 2 (estadificación inversa)');
  ok('estadio 1 deshabilitado (sin estadificación inversa)');
  await page.locator('input[type=file]:not([capture])').setInputFiles(imgPath);
  await page.getByText(/NO muestra rostro/).click();
  await page.getByLabel('Largo (cm)').fill('3');
  await page.getByLabel('Ancho (cm)').fill('2');
  await page.getByLabel('Evolución observada').selectOption('mejoria');
  await page.getByRole('button', { name: 'Confirmar valoración' }).click();
  await page.getByText('Línea de tiempo de valoraciones').waitFor();
  await page.getByText(/12 → 6 cm²/).waitFor();
  await shot('evolucion-2'); ok('evolución registrada: 12 → 6 cm² (−50 %)');

  console.log('7. Comparación fotográfica lado a lado');
  await page.getByRole('link', { name: /Comparar/ }).first().click();
  await page.getByText('Diferencias documentadas').waitFor();
  await shot('comparar'); ok('comparación disponible');

  console.log('8. Braden e indicadores');
  await page.goto(`${BASE}/pacientes`);
  await page.getByRole('link', { name: /Ficticia Gómez/ }).click();
  await page.getByRole('tab', { name: 'Escala de Braden' }).click();
  await page.getByRole('link', { name: /Nueva valoración de Braden/ }).click();
  for (const [dim, opt] of [['Percepción sensorial', 'Muy limitada'], ['Humedad', 'Ocasionalmente húmeda'], ['Actividad', 'Encamado/a'], ['Movilidad', 'Muy limitada'], ['Nutrición', 'Probablemente inadecuada'], ['Fricción y cizallamiento', 'Problema potencial']])
    await page.getByRole('radiogroup', { name: dim }).getByRole('radio', { name: new RegExp(opt) }).click();
  await page.getByText('Riesgo alto (10–12)').waitFor();
  await shot('braden');
  await page.getByRole('button', { name: 'Confirmar valoración' }).click();
  await page.getByText('Evolución del riesgo').waitFor(); ok('Braden 11 = riesgo alto');
  await page.goto(`${BASE}/indicadores`);
  await page.getByText('Prevalencia puntual de LPP').waitFor();
  await shot('indicadores'); ok('indicadores calculados');

  console.log('9. Permisos: cama de otro sector sin identidad');
  await page.goto(`${BASE}/sectores/${encodeURIComponent('seed:sec_cm_1')}`);
  await page.getByText('Paciente de otro sector').first().waitFor(); ok('paciente de CM S1 oculto para enfermería CQ4');

  console.log('10. Modo oscuro y escritorio');
  await page.getByRole('button', { name: 'Activar modo oscuro' }).click();
  await page.goto(`${BASE}/`);
  await shot('inicio-oscuro');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/sectores/${encodeURIComponent('seed:sec_cq_4')}`);
  await page.getByRole('heading', { name: 'Habitación 30' }).waitFor();
  await shot('sector4-escritorio'); ok('responsive y modo oscuro');

  const relevant = errors.filter((e) => !/favicon|Download the React DevTools/.test(e));
  if (relevant.length) throw new Error('Errores de consola: ' + relevant.join(' | '));
  console.log('\nE2E OK — flujo prioritario verificado');
} catch (e) {
  await shot('FALLO').catch(() => undefined);
  console.error('\nE2E FALLÓ:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
