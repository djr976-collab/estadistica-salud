/** Normaliza texto: minúsculas, sin tildes, sin puntuación redundante. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!.,;:()"'«»]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const UNITS: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22,
  veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28,
  veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80,
  noventa: 90, cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400,
  quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900,
};

/**
 * Extrae un número de una respuesta escrita u oral.
 * Acepta "41,7", "41.7", "cuarenta y dos", "veintiuno coma cinco", "5 ml".
 */
export function parseSpanishNumber(input: string): number | null {
  const raw = input.toLowerCase().replace(/(\d)\s*,\s*(\d)/g, "$1.$2");
  const digit = raw.match(/-?\d+(\.\d+)?/);
  if (digit) return parseFloat(digit[0]);

  const words = normalize(input).split(" ");
  let total = 0;
  let current = 0;
  let found = false;
  let decimalPart: number | null = null;
  let inDecimal = false;
  for (const w of words) {
    if (w === "y") continue;
    if (w === "coma" || w === "punto") {
      inDecimal = true;
      continue;
    }
    if (w === "mil") {
      total += (current || 1) * 1000;
      current = 0;
      found = true;
      continue;
    }
    if (w === "medio" && found) {
      decimalPart = 0.5;
      continue;
    }
    if (w in UNITS) {
      found = true;
      if (inDecimal) decimalPart = (decimalPart ?? 0) * 10 + UNITS[w];
      else current += UNITS[w];
    }
  }
  if (!found) return null;
  let value = total + current;
  if (decimalPart !== null) {
    value += decimalPart < 1 ? decimalPart : decimalPart / Math.pow(10, String(decimalPart).length);
  }
  return value;
}

/** Distancia de Levenshtein para tolerar errores de transcripción oral. */
export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** ¿El texto contiene el término (o algo muy parecido, para errores de dictado)? */
export function fuzzyIncludes(text: string, term: string): { hit: boolean; fuzzy: boolean } {
  const t = normalize(text);
  const k = normalize(term);
  if (!k) return { hit: false, fuzzy: false };
  if (t.includes(k)) return { hit: true, fuzzy: false };
  if (k.includes(" ") || k.length < 5) return { hit: false, fuzzy: false };
  const maxDist = k.length >= 8 ? 2 : 1;
  for (const w of t.split(" ")) {
    if (Math.abs(w.length - k.length) <= maxDist && levenshtein(w, k) <= maxDist) return { hit: true, fuzzy: true };
  }
  return { hit: false, fuzzy: false };
}
