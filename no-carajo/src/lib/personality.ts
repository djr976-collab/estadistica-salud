import type { Personality, Verdict } from "./types";

/**
 * Regla editorial del personaje: el humor apunta SIEMPRE a la equivocación o a la
 * situación, nunca a la persona (inteligencia, identidad, cuerpo, origen, etc.).
 * Sin insultos discriminatorios, sin amenazas, sin humillación.
 * En errores graves de seguridad el tono es SIEMPRE profesional, en todos los modos.
 */

type Moment = "intro" | "pregunta" | Verdict | "racha" | "tiempo" | "cierreBueno" | "cierreMalo" | "recuperacionOk";

const BANK: Record<Personality, Partial<Record<Moment, string[]>>> = {
  academico: {
    intro: [
      "Buenas noches. Soy el Jefe de Guardia. Hoy vamos a razonar, no a adivinar. Empecemos.",
      "Bienvenido a la guardia. Cada respuesta tiene que tener un fundamento. Adelante.",
    ],
    pregunta: ["Siguiente pregunta.", "Atención a esta.", "Pensala con calma."],
    correcta: ["Correcto. Bien fundamentado.", "Exacto. Esa es la conducta adecuada.", "Muy bien. Así se razona un caso."],
    parcial: [
      "Vas por buen camino, pero la respuesta está incompleta.",
      "Parcialmente correcto. Te falta un elemento importante.",
    ],
    incorrecta: [
      "No es correcto. Revisemos el fundamento.",
      "Incorrecto. Veamos por qué, porque este concepto es clave.",
      "No. Analicemos dónde estuvo el error de razonamiento.",
    ],
    racha: ["Excelente racha. Se nota el estudio.", "Consistencia: eso es lo que esperamos en la práctica."],
    tiempo: ["Se terminó el tiempo. En una emergencia hay que priorizar rápido. Veamos la respuesta."],
    cierreBueno: ["Muy buen desempeño. Seguí consolidando estos contenidos."],
    cierreMalo: ["Hay contenidos para reforzar. Revisá las explicaciones y usá el modo Revancha."],
    recuperacionOk: ["Correcto. Ahora sí: esa comprensión protege al paciente."],
  },
  ironico: {
    intro: [
      "¡Bienvenido a mi guardia! Acá el café es malo, pero las preguntas son buenísimas.",
      "A ver qué trajiste hoy… ¿estudio o pura fe? Arrancamos.",
    ],
    pregunta: ["A ver esta…", "Siguiente. Sin googlear, eh.", "Esta la tomo siempre. Siempre."],
    correcta: [
      "¡Mirá vos! Alguien abrió el apunte.",
      "¡Eso! Hasta la máquina de café te aplaude.",
      "Correcto. Me sorprendiste para bien, y eso que estoy de guardia hace 14 horas.",
    ],
    parcial: [
      "Casi… estuviste a una neurona de la gloria.",
      "Medio punto. Como el mate lavado: algo tiene, pero no alcanza.",
    ],
    incorrecta: [
      "¡Mamita querida! Si administrás así, primero repasamos farmacología.",
      "Uy, no. Esa respuesta la vi pasar y me saludó.",
      "Mmm… no. Pero tranqui: para eso está el simulador y no el paciente.",
      "¡Ay, ay, ay! Esa opción la pusimos de adorno.",
    ],
    racha: ["¡Racha! ¿Te tomaste un litro de café o estudiaste de verdad?", "Seguí así y te dejo elegir el turno."],
    tiempo: ["Se te fue el tiempo… el paciente no espera, ¿viste?"],
    cierreBueno: ["Bien ahí. Hoy no me hiciste agarrar la cabeza… tanto."],
    cierreMalo: ["Hubo momentos difíciles. Andá al modo Revancha que te estoy esperando."],
    recuperacionOk: ["¡Ahora sí! Esa es la que salva pacientes."],
  },
  sinfiltro: {
    intro: [
      "¡Bienvenido a la guardia, carajo! Acá se razona. Si no sabés, se aprende. ¡Vamos!",
      "¡Dale, che! Esto es la guardia, no un recreo. ¡Arrancamos!",
    ],
    pregunta: ["¡A ver esta, carajo!", "¡Atento que esta es jodida!", "¡Siguiente! Concentración."],
    correcta: [
      "¡Eso, carajo! ¡Por fin alguien estudió fisiología!",
      "¡Bien ahí, mierda! ¡Así se hace!",
      "¡La puta, qué bien! ¡Esa es la respuesta!",
    ],
    parcial: [
      "¡Mierda! Estuviste cerca, pero te faltó una parte importante.",
      "¡Casi, carajo! Te quedaste a mitad de camino.",
    ],
    incorrecta: [
      "¡No, carajo! Esa no es. Pensá de nuevo el fundamento.",
      "¡La puta madre! ¡Esa no es la respuesta! Razonemos qué está pasando.",
      "¡Dale, che! ¡No me mandes cualquier verdura! Razoná el caso.",
      "¡Uh, la mierda! Error. Pero mejor acá que con un paciente.",
    ],
    racha: ["¡Racha, carajo! ¡No te para nadie!", "¡Qué bestia! ¡Seguí así!"],
    tiempo: ["¡Se acabó el tiempo, carajo! En la guardia no hay prórroga."],
    cierreBueno: ["¡Muy bien, carajo! Hoy la rompiste."],
    cierreMalo: ["¡Mierda, hubo errores! Pero los errores se estudian. Andá a la Revancha."],
    recuperacionOk: ["¡Eso! Ahora sí entendiste por qué importa."],
  },
};

/** En errores graves, el instructor deja el personaje y habla en tono profesional. */
const GRAVE_LINES = [
  "Alto. Detengo la simulación: esa decisión pondría en riesgo al paciente.",
  "Detengo la guardia. Esto es un error grave de seguridad y lo vamos a entender bien.",
];

export function line(p: Personality, moment: Moment): string {
  if (moment === "grave") return pick(GRAVE_LINES);
  const pool = BANK[p][moment] ?? BANK.academico[moment] ?? [""];
  return pick(pool);
}

/** Frase "limpia" del modo irónico para cuando el docente desactivó el lenguaje fuerte. */
export function effectivePersonality(p: Personality, spicyAllowed: boolean): Personality {
  return p === "sinfiltro" && !spicyAllowed ? "ironico" : p;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const PERSONALITIES: { id: Personality; name: string; desc: string; sample: string; adult?: boolean }[] = [
  {
    id: "academico",
    name: "Profesor académico",
    desc: "Serio, respetuoso, científico y exigente.",
    sample: "«No es correcto. Revisemos el fundamento.»",
  },
  {
    id: "ironico",
    name: "Profesor irónico",
    desc: "Humor y sarcasmo moderado, siempre sobre el error.",
    sample: "«¡Mamita querida! Si administrás así, primero repasamos farmacología.»",
  },
  {
    id: "sinfiltro",
    name: "Profesor sin filtro",
    desc: "Humor picante argentino con palabrotas moderadas. Sólo +18 y opcional.",
    sample: "«¡No, carajo! ¡Revisá los cinco correctos antes de administrar!»",
    adult: true,
  },
];
