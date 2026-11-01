import type { Question } from "@/lib/types";

/**
 * Banco de casos clínicos progresivos (modo Guardia).
 * Cada caso es una secuencia de pasos: la situación evoluciona y el estudiante decide.
 * Criterio editorial: no se indican dosis; las conductas farmacológicas se expresan como
 * "según indicación médica / protocolo institucional". Revisar con el equipo docente antes de su uso.
 */
export const CASES: Question[] = [
  // ═════════════ HIPOGLUCEMIA ═════════════
  {
    id: "c-hipo-1",
    caseId: "hipoglucemia",
    caseStep: 1,
    caseTitle: "Madrugada en clínica médica: «la señora está rara»",
    moduleId: "signos",
    level: "basico",
    type: "mcq",
    caseIntro:
      "06:30 h. Sra. L., 72 años, diabetes tipo 2 en tratamiento con insulina, en ayunas para un estudio. La encontrás sudorosa, temblorosa, pálida y algo confusa.",
    vitals: { pa: "135/80", fc: 108, fr: 18, sat: 97, temp: 36.4, conciencia: "Confusa" },
    prompt: "¿Cuál es tu primera acción?",
    options: [
      "Administrar la insulina de la mañana, que está indicada",
      "Controlar la glucemia capilar de inmediato",
      "Esperar a que llegue el desayuno",
      "Pedir un sedante porque está inquieta",
    ],
    answer: 1,
    critical: {
      options: [0, 3],
      risk: "Los signos son compatibles con hipoglucemia. Administrar insulina puede profundizarla hasta convulsiones o coma; sedar enmascara el cuadro y retrasa el tratamiento.",
      recovery: {
        prompt: "Recuperación obligatoria: sudoración, temblor, taquicardia y confusión en un paciente con insulina y en ayunas sugieren primero…",
        options: ["Ansiedad por el estudio", "Hipoglucemia, que se confirma con glucemia capilar", "Hipertermia"],
        answer: 1,
        explanation: "Ante sospecha de hipoglucemia se mide la glucemia capilar de inmediato: es rápido y define la conducta.",
      },
    },
    explanation:
      "Paciente con insulina + ayuno + signos adrenérgicos (sudoración, temblor, taquicardia) y neuroglucopénicos (confusión) = sospecha de hipoglucemia. Se confirma con glucemia capilar antes de cualquier otra acción.",
  },
  {
    id: "c-hipo-2",
    caseId: "hipoglucemia",
    caseStep: 2,
    moduleId: "signos",
    level: "basico",
    type: "mcq",
    caseIntro: "Glucemia capilar: 52 mg/dL. La paciente está consciente y puede tragar sin dificultad.",
    vitals: { pa: "135/80", fc: 104, fr: 18, sat: 97, glu: 52, conciencia: "Confusa, colabora" },
    prompt: "¿Cuál es la conducta más adecuada?",
    options: [
      "Ofrecer hidratos de carbono de absorción rápida por vía oral según protocolo, avisar al médico y repetir la glucemia a los 15 minutos",
      "Darle un chocolate o un alimento graso y volver en una hora",
      "Administrar insulina rápida para «estabilizar»",
      "No hacer nada hasta que el médico la evalúe",
    ],
    answer: 0,
    critical: {
      options: [2],
      risk: "La insulina baja todavía más la glucemia: con 52 mg/dL puede provocar convulsiones, coma o muerte.",
      recovery: {
        prompt: "Recuperación obligatoria: en una hipoglucemia, la insulina…",
        options: ["Está contraindicada: empeora la hipoglucemia", "Ayuda a estabilizar", "Es el tratamiento de elección"],
        answer: 0,
        explanation: "En hipoglucemia se aporta glucosa; la insulina se revisa con el médico (suele haber que ajustar la indicación en ayunas).",
      },
    },
    explanation:
      "Con glucemia < 70 mg/dL y paciente consciente que deglute, se aportan hidratos de absorción rápida por vía oral (regla «15/15»: ~15 g y control a los 15 min, según protocolo). Los alimentos con grasa enlentecen la absorción. Si no puede tragar o está inconsciente: nada por boca, aviso urgente y tratamiento parenteral según indicación.",
    reference: "Criterios de hipoglucemia (ADA) — validar con el protocolo institucional.",
  },
  {
    id: "c-hipo-3",
    caseId: "hipoglucemia",
    caseStep: 3,
    moduleId: "signos",
    level: "intermedio",
    type: "open",
    caseIntro: "15 minutos después: glucemia 88 mg/dL, lúcida, refiere que «se siente mejor».",
    vitals: { pa: "130/80", fc: 88, fr: 16, sat: 98, glu: 88, conciencia: "Alerta" },
    prompt: "¿Qué registrás y qué acciones tomás para prevenir que vuelva a ocurrir?",
    keyConcepts: [
      { label: "registro: hora, valores, tratamiento y respuesta", synonyms: ["registr", "hora", "valor", "historia clinica", "anot", "document"] },
      { label: "comunicar al médico / revisar indicación de insulina en ayunas", synonyms: ["medico", "comunic", "avis", "insulina", "indicacion", "ajust"] },
      { label: "controles glucémicos seriados", synonyms: ["control", "glucemia", "seriad", "monitor", "repetir"] },
      { label: "aporte de alimento / colación al finalizar el ayuno", synonyms: ["colacion", "comida", "alimento", "desayuno", "ingesta", "hidrato"] },
    ],
    minConcepts: 3,
    explanation:
      "Se registra hora, glucemias, tratamiento y respuesta; se comunica al médico para revisar la insulina durante el ayuno; se indican controles seriados y se asegura ingesta al terminar el ayuno. La hipoglucemia es un evento adverso prevenible: si correspondía, se notifica.",
  },

  // ═════════════ REACCIÓN TRANSFUSIONAL ═════════════
  {
    id: "c-trans-1",
    caseId: "transfusion",
    caseStep: 1,
    caseTitle: "Transfusión en curso: escalofríos a los 10 minutos",
    moduleId: "seguridad",
    level: "intermedio",
    type: "mcq",
    caseIntro:
      "Sr. M., 58 años, recibe una unidad de glóbulos rojos. A los 10 minutos refiere escalofríos y dolor lumbar. Temperatura basal 36,8 °C.",
    vitals: { pa: "100/60", fc: 118, fr: 22, sat: 95, temp: 38.6, conciencia: "Alerta, ansioso" },
    prompt: "¿Qué hacés primero?",
    options: [
      "Disminuir el goteo y continuar observando",
      "Detener la transfusión de inmediato, mantener la vía con solución fisiológica por otra tubuladura y avisar al médico y a hemoterapia",
      "Dar un antitérmico y seguir transfundiendo",
      "Terminar la unidad rápido para que no se desperdicie",
    ],
    answer: 1,
    critical: {
      options: [0, 2, 3],
      risk: "Fiebre, escalofríos, dolor lumbar, taquicardia e hipotensión al inicio de una transfusión pueden indicar una reacción hemolítica aguda. Cada mililitro adicional aumenta el daño (insuficiencia renal, CID, shock).",
      recovery: {
        prompt: "Recuperación obligatoria: ante cualquier sospecha de reacción transfusional, lo primero es…",
        options: ["Detener la transfusión", "Bajar el goteo", "Medicar y continuar"],
        answer: 0,
        explanation: "Se detiene la transfusión sin retirar la vía (se mantiene con solución fisiológica por un equipo nuevo) y se da aviso inmediato.",
      },
    },
    explanation:
      "Ante sospecha de reacción transfusional: detener la transfusión, mantener la vía permeable con SF por otra tubuladura, controlar signos vitales, avisar al médico y a hemoterapia, y verificar identificación paciente-unidad.",
    reference: "Normas de hemoterapia — validar con el servicio de hemoterapia local.",
  },
  {
    id: "c-trans-2",
    caseId: "transfusion",
    caseStep: 2,
    moduleId: "seguridad",
    level: "intermedio",
    type: "mcq",
    caseIntro: "La transfusión está detenida y el médico está en camino.",
    vitals: { pa: "104/62", fc: 114, fr: 20, sat: 96, temp: 38.4 },
    prompt: "¿Qué hacés con la unidad de sangre y el equipo de infusión?",
    options: [
      "Los descarto en residuos patogénicos para evitar riesgos",
      "Los conservo, verifico nuevamente la identificación paciente-unidad y los envío a hemoterapia junto con las muestras que indique el protocolo",
      "Los guardo en la heladera del office por si se reanuda",
      "Los devuelvo sin informar nada",
    ],
    answer: 1,
    explanation:
      "La bolsa y el equipo son evidencia para estudiar la reacción (compatibilidad, contaminación). Se conservan y se envían a hemoterapia con las muestras del paciente según protocolo. Se registra y notifica el evento (hemovigilancia).",
  },
  {
    id: "c-trans-3",
    caseId: "transfusion",
    caseStep: 3,
    moduleId: "seguridad",
    level: "intermedio",
    type: "tf",
    caseIntro: "Revisando el caso con tu equipo…",
    prompt:
      "Verdadero o falso: la verificación de identidad paciente-unidad al pie de la cama, realizada por dos personas antes de iniciar, es una barrera clave para prevenir reacciones hemolíticas por incompatibilidad ABO.",
    tfAnswer: true,
    explanation:
      "Verdadero. La mayoría de las reacciones hemolíticas graves se deben a errores de identificación. La doble verificación al pie de la cama y el control en los primeros 15 minutos son barreras fundamentales.",
  },

  // ═════════════ ANAFILAXIA ═════════════
  {
    id: "c-ana-1",
    caseId: "anafilaxia",
    caseStep: 1,
    caseTitle: "Primera dosis de antibiótico endovenoso",
    moduleId: "farmaco",
    level: "intermedio",
    type: "mcq",
    caseIntro:
      "Sra. P., 45 años, recibe la primera dosis de un antibiótico EV. A los 5 minutos presenta prurito, habones, disfonía y sibilancias. Refiere «se me cierra la garganta».",
    vitals: { pa: "82/50", fc: 128, fr: 28, sat: 90, conciencia: "Alerta, angustiada" },
    prompt: "¿Cuál es tu primera acción?",
    options: [
      "Disminuir la velocidad de infusión y observar",
      "Detener la infusión, pedir ayuda inmediata (código/equipo de respuesta rápida) y preparar el tratamiento de primera línea según protocolo",
      "Darle un antihistamínico por boca y reevaluar en 30 minutos",
      "Retirar la vía periférica para cortar el contacto con el fármaco",
    ],
    answer: 1,
    critical: {
      options: [0, 2, 3],
      risk: "Compromiso de vía aérea + hipotensión tras un fármaco = anafilaxia, emergencia potencialmente mortal en minutos. Seguir infundiendo o demorar el tratamiento puede ser fatal; retirar la vía quita el acceso necesario para el tratamiento.",
      recovery: {
        prompt: "Recuperación obligatoria: ante sospecha de anafilaxia durante una infusión…",
        options: ["Se detiene el fármaco, se pide ayuda y se trata sin demora", "Se baja el goteo", "Se espera a ver si cede sola"],
        answer: 0,
        explanation: "Detener la exposición, pedir ayuda y tratar de inmediato. Se conserva la vía venosa.",
      },
    },
    explanation:
      "Afectación cutánea + respiratoria + hipotensión tras la exposición a un fármaco = anafilaxia. Se detiene la infusión (manteniendo la vía), se pide ayuda y se inicia el tratamiento de primera línea según indicación/protocolo.",
  },
  {
    id: "c-ana-2",
    caseId: "anafilaxia",
    caseStep: 2,
    moduleId: "farmaco",
    level: "intermedio",
    type: "mcq",
    caseIntro: "Llega el equipo. El médico pide que prepares el tratamiento de primera línea.",
    vitals: { pa: "80/48", fc: 132, fr: 28, sat: 89, conciencia: "Alerta" },
    prompt: "Según las guías de anafilaxia, ¿cuál es el fármaco de primera línea?",
    options: ["Antihistamínico", "Corticoide endovenoso", "Adrenalina por vía intramuscular", "Salbutamol inhalado"],
    answer: 2,
    explanation:
      "La adrenalina IM (cara anterolateral del muslo) es el tratamiento de primera línea y no debe demorarse. Antihistamínicos y corticoides son coadyuvantes: no revierten el compromiso de la vía aérea ni el shock. Dosis y repetición: según indicación médica y protocolo.",
    reference: "Guías internacionales de anafilaxia (p. ej., WAO) — validar con el protocolo institucional.",
  },
  {
    id: "c-ana-3",
    caseId: "anafilaxia",
    caseStep: 3,
    moduleId: "farmaco",
    level: "intermedio",
    type: "mcq",
    caseIntro: "Tras el tratamiento mejora la respiración, pero sigue hipotensa y refiere mareo. Pide ir al baño.",
    vitals: { pa: "88/54", fc: 116, fr: 22, sat: 94, o2: "Máscara", conciencia: "Alerta, mareada" },
    prompt: "¿En qué posición la mantenés?",
    options: [
      "La acompaño caminando al baño",
      "Decúbito supino con miembros inferiores elevados, sin incorporarla bruscamente",
      "Sentada al borde de la cama con las piernas colgando",
      "Decúbito prono",
    ],
    answer: 1,
    critical: {
      options: [0, 2],
      risk: "Incorporar o poner de pie a un paciente en shock anafiláctico puede provocar colapso cardiovascular súbito y paro.",
      recovery: {
        prompt: "Recuperación obligatoria: un paciente hipotenso por anafilaxia, sin dificultad respiratoria marcada, debe permanecer…",
        options: ["Acostado con las piernas elevadas", "De pie", "Sentado"],
        answer: 0,
        explanation: "Decúbito supino con piernas elevadas favorece el retorno venoso. Si predomina la dificultad respiratoria, semisentado. Nunca levantarlo bruscamente.",
      },
    },
    explanation:
      "Con hipotensión: decúbito supino con piernas elevadas. Si predomina la dificultad respiratoria, semisentado. Embarazada: decúbito lateral izquierdo. Se evita incorporar o deambular hasta la estabilización.",
  },
  {
    id: "c-ana-4",
    caseId: "anafilaxia",
    caseStep: 4,
    moduleId: "farmaco",
    level: "intermedio",
    type: "open",
    caseIntro: "La paciente se estabiliza y queda en observación.",
    vitals: { pa: "112/70", fc: 96, fr: 18, sat: 97, conciencia: "Alerta" },
    prompt: "¿Qué registrás, a quién notificás y qué le explicás a la paciente antes del alta?",
    keyConcepts: [
      { label: "registro de la alergia en la historia clínica e identificación (p. ej., pulsera)", synonyms: ["alergia", "historia clinica", "pulsera", "identific", "registr"] },
      { label: "notificación del evento (farmacovigilancia / evento adverso)", synonyms: ["notific", "farmacovigilancia", "evento adverso", "reporte", "report"] },
      { label: "educación: evitar el fármaco y avisar siempre de la alergia", synonyms: ["educa", "explic", "evitar", "avisar", "informar", "ensen"] },
      { label: "observación por posible reacción tardía", synonyms: ["observ", "bifasica", "tardia", "vigil", "control"] },
    ],
    minConcepts: 3,
    explanation:
      "Registrar la reacción y la alergia en la HC, identificar al paciente según protocolo, notificar a farmacovigilancia, educar para evitar el fármaco y avisar siempre de la alergia, y mantener observación por el riesgo de reacción bifásica.",
  },

  // ═════════════ SEPSIS POSTOPERATORIA ═════════════
  {
    id: "c-sep-1",
    caseId: "sepsis",
    caseStep: 1,
    caseTitle: "Tercer día postoperatorio: fiebre y confusión",
    moduleId: "urgencias",
    level: "avanzado",
    type: "mcq",
    caseIntro: "Sr. A., 66 años, postoperatorio día 3 de cirugía abdominal. Está confuso, febril y taquipneico. PA basal 130/80.",
    vitals: { pa: "92/58", fc: 118, fr: 24, sat: 93, temp: 38.9, conciencia: "Confuso" },
    prompt: "¿Cómo interpretás la situación?",
    options: [
      "Fiebre postoperatoria esperable: antitérmico y reevaluar en 6 horas",
      "Posible sepsis: cumple criterios de alarma (FR ≥ 22, alteración del estado mental, PAS ≤ 100). Aviso médico urgente",
      "Deshidratación leve: ofrecer líquidos por boca",
      "Ansiedad por la internación",
    ],
    answer: 1,
    critical: {
      options: [0, 3],
      risk: "En la sepsis cada hora de demora en el tratamiento aumenta la mortalidad. Atribuir los signos a «fiebre esperable» o ansiedad retrasa la consulta.",
      recovery: {
        prompt: "Recuperación obligatoria: ¿cuáles son los tres criterios del qSOFA?",
        options: [
          "FR ≥ 22, alteración del estado mental y PAS ≤ 100 mmHg",
          "Fiebre, tos y dolor",
          "Glucemia, peso y diuresis",
        ],
        answer: 0,
        explanation: "qSOFA ≥ 2 en un paciente con sospecha de infección identifica mayor riesgo de mala evolución y obliga a evaluación urgente.",
      },
    },
    explanation:
      "Sospecha de infección + qSOFA ≥ 2 (taquipnea, confusión, hipotensión) obliga a evaluación médica urgente. Enfermería es clave en la detección precoz: comunicar con SBAR.",
    reference: "Sepsis-3 / Surviving Sepsis Campaign — validar con el protocolo institucional.",
  },
  {
    id: "c-sep-2",
    caseId: "sepsis",
    caseStep: 2,
    moduleId: "urgencias",
    level: "avanzado",
    type: "mcq",
    caseIntro: "El médico indica hemocultivos, antibiótico EV y expansión con cristaloides.",
    vitals: { pa: "90/56", fc: 120, fr: 24, sat: 94, temp: 38.8, o2: "CN 2 L/min" },
    prompt: "¿Cuál es la secuencia correcta?",
    options: [
      "Iniciar el antibiótico ahora y extraer los hemocultivos mañana",
      "Extraer los hemocultivos antes del antibiótico, pero sin demorar su inicio",
      "Esperar el resultado de los hemocultivos para elegir el antibiótico",
      "Primero completar la expansión y recién después pensar en el antibiótico",
    ],
    answer: 1,
    critical: {
      options: [2],
      risk: "Los cultivos tardan días. Esperarlos para iniciar el antibiótico en un paciente séptico aumenta la mortalidad.",
      recovery: {
        prompt: "Recuperación obligatoria: en sepsis, el antibiótico…",
        options: ["Se inicia sin esperar resultados de cultivos", "Se inicia sólo con cultivo positivo", "Se posterga hasta estabilizar"],
        answer: 0,
        explanation: "Se extraen cultivos antes, siempre que no demore el antibiótico, que se inicia de forma precoz.",
      },
    },
    explanation:
      "Los hemocultivos se extraen antes del antibiótico (aumentan el rendimiento) sin demorar su administración. Expansión, antibiótico y monitorización se coordinan en paralelo según indicación.",
  },
  {
    id: "c-sep-3",
    caseId: "sepsis",
    caseStep: 3,
    moduleId: "urgencias",
    level: "avanzado",
    type: "mcq",
    caseIntro: "Durante la reanimación te piden «control estricto de perfusión».",
    vitals: { pa: "100/62", fc: 108, fr: 22, sat: 95, temp: 38.2 },
    prompt: "¿Qué parámetro de enfermería refleja la perfusión renal y conviene controlar de forma horaria?",
    options: ["Diuresis horaria", "Peso diario únicamente", "Temperatura cada 6 horas", "Glucemia capilar"],
    answer: 0,
    explanation:
      "La diuresis horaria es un indicador accesible de perfusión de órganos. Un objetivo frecuente es ≥ 0,5 mL/kg/h (validar con indicación médica). Se registra junto con PA, FC, estado mental y relleno capilar.",
  },

  // ═════════════ DELIRIUM Y RIESGO DE CAÍDAS ═════════════
  {
    id: "c-del-1",
    caseId: "delirium",
    caseStep: 1,
    caseTitle: "03:00 h: adulto mayor desorientado que quiere levantarse",
    moduleId: "seguridad",
    level: "intermedio",
    type: "mcq",
    caseIntro: "Sr. B., 84 años, internado por neumonía. Desorientado, intenta levantarse solo y se arrancó parcialmente el catéter periférico. Durante el día estaba orientado.",
    vitals: { pa: "128/76", fc: 96, fr: 22, sat: 89, temp: 37.6, o2: "AA (se quitó la cánula)", conciencia: "Desorientado" },
    prompt: "¿Cuál es la intervención inicial más adecuada?",
    options: [
      "Aplicar contención mecánica en las cuatro extremidades sin más evaluación",
      "Garantizar su seguridad, valorar causas reversibles (oxigenación, dolor, glucemia, retención urinaria), reorientarlo y avisar al médico",
      "Administrar un sedante que quedó de otro paciente",
      "Dejarlo tranquilo y volver en una hora",
    ],
    answer: 1,
    critical: {
      options: [2, 3],
      risk: "Administrar un fármaco sin indicación para ese paciente es un error grave de medicación. Dejar sin supervisión a un paciente desorientado que intenta levantarse expone a caídas y fracturas.",
      recovery: {
        prompt: "Recuperación obligatoria: ¿qué medicamentos puede administrar enfermería?",
        options: ["Sólo los indicados para ese paciente, verificando los correctos", "Cualquiera que esté en el office", "Los de otro paciente si es urgente"],
        answer: 0,
        explanation: "Sólo se administra lo indicado para ese paciente, verificando paciente, medicamento, dosis, vía y hora.",
      },
    },
    explanation:
      "Un cambio agudo de conducta en un adulto mayor sugiere delirium. Se buscan causas reversibles (aquí: SatO₂ 89% sin O₂), se garantiza la seguridad (cama baja, timbre a mano, acompañamiento) y se avisa. La contención mecánica es último recurso, con indicación y según protocolo.",
  },
  {
    id: "c-del-2",
    caseId: "delirium",
    caseStep: 2,
    moduleId: "seguridad",
    level: "basico",
    type: "tf",
    caseIntro: "Recolocás el O₂: la saturación sube a 94% y el paciente se calma progresivamente. Vas a reevaluar el riesgo de caídas.",
    vitals: { pa: "126/74", fc: 88, fr: 18, sat: 94, o2: "CN 2 L/min", conciencia: "Somnoliento, orientado en persona" },
    prompt: "Verdadero o falso: la escala de Morse se utiliza para valorar el riesgo de caídas.",
    tfAnswer: true,
    explanation:
      "Verdadero. La escala de Morse valora antecedentes de caídas, diagnósticos secundarios, ayuda para deambular, terapia EV, marcha y estado mental. Guía medidas preventivas según el puntaje.",
  },
  {
    id: "c-del-3",
    caseId: "delirium",
    caseStep: 3,
    moduleId: "seguridad",
    level: "intermedio",
    type: "open",
    caseIntro: "Al día siguiente, la familia pregunta cómo pueden ayudar.",
    vitals: { pa: "124/72", fc: 84, fr: 18, sat: 95, o2: "CN 1 L/min", conciencia: "Orientado" },
    prompt: "Nombrá al menos tres medidas no farmacológicas para prevenir el delirium.",
    keyConcepts: [
      { label: "reorientación (reloj, calendario, explicar dónde está)", synonyms: ["orient", "reloj", "calendario", "fecha"] },
      { label: "acompañamiento familiar", synonyms: ["famili", "acompan", "visita"] },
      { label: "respetar el sueño (luz/ruido de noche, luz natural de día)", synonyms: ["sueno", "dormir", "luz", "ruido", "noche"] },
      { label: "anteojos y audífonos si los usa", synonyms: ["anteojo", "lente", "audifono", "audicion", "vision"] },
      { label: "movilización temprana", synonyms: ["moviliz", "caminar", "levant", "deambul"] },
      { label: "hidratación, nutrición y control del dolor", synonyms: ["hidrat", "nutri", "dolor", "alimenta"] },
    ],
    minConcepts: 3,
    explanation:
      "Reorientación, presencia de la familia, higiene del sueño, uso de anteojos/audífonos, movilización temprana, hidratación y control del dolor reducen la incidencia de delirium en adultos mayores hospitalizados.",
  },

  // ═════════════ EXTRAVASACIÓN / FLEBITIS ═════════════
  {
    id: "c-ext-1",
    caseId: "extravasacion",
    caseStep: 1,
    caseTitle: "El suero «no baja» y el brazo está hinchado",
    moduleId: "bioseguridad",
    level: "basico",
    type: "mcq",
    caseIntro:
      "Paciente con infusión por catéter periférico en el antebrazo. Refiere dolor; la zona está edematosa, fría y pálida, y el goteo se enlenteció.",
    vitals: { pa: "122/78", fc: 82, fr: 16, sat: 97, temp: 36.6, dolor: 6 },
    prompt: "¿Qué sospechás y qué hacés primero?",
    options: [
      "Obstrucción: lavo el catéter con jeringa a presión para destaparlo",
      "Infiltración/extravasación: detengo la infusión de inmediato",
      "Es normal: aumento la velocidad para que pase",
      "Aplico calor y sigo infundiendo",
    ],
    answer: 1,
    critical: {
      options: [0, 2],
      risk: "Forzar o aumentar la infusión introduce más líquido o fármaco en el tejido: puede causar necrosis y síndrome compartimental, sobre todo con fármacos irritantes o vesicantes.",
      recovery: {
        prompt: "Recuperación obligatoria: ante signos de infiltración/extravasación, lo primero es…",
        options: ["Detener la infusión", "Lavar a presión", "Aumentar el goteo"],
        answer: 0,
        explanation: "Detener la infusión. Si el fármaco es vesicante, se sigue el protocolo específico (puede incluir aspirar antes de retirar el catéter) y se avisa.",
      },
    },
    explanation:
      "Edema, frialdad, palidez y dolor en el sitio con goteo lento = infiltración (o extravasación si el fármaco es vesicante). Se detiene la infusión, se aplica el protocolo según el fármaco, se retira el catéter, se eleva el miembro, se avisa y se registra.",
    reference: "Protocolo institucional de manejo de extravasación — validar localmente.",
  },
  {
    id: "c-ext-2",
    caseId: "extravasacion",
    caseStep: 2,
    moduleId: "bioseguridad",
    level: "basico",
    type: "mcq",
    caseIntro: "Colocás un nuevo catéter en el otro brazo. Días después, ese sitio aparece enrojecido y doloroso a lo largo del trayecto venoso.",
    vitals: { temp: 37.4, dolor: 4 },
    prompt: "¿Qué escala se usa con frecuencia para valorar la flebitis?",
    options: ["Escala de Maddox (o VIP)", "Escala de Braden", "Escala de Glasgow", "Escala de Morse"],
    answer: 0,
    explanation:
      "Las escalas de Maddox y VIP (Visual Infusion Phlebitis) gradúan la flebitis según dolor, eritema, edema, induración y cordón venoso palpable. Braden valora lesiones por presión; Glasgow, nivel de conciencia; Morse, riesgo de caídas.",
  },
  {
    id: "c-ext-3",
    caseId: "extravasacion",
    caseStep: 3,
    moduleId: "bioseguridad",
    level: "intermedio",
    type: "open",
    caseIntro: "Retiraste el catéter. Antes de terminar el turno tenés que dejarlo documentado.",
    prompt: "¿Qué datos debe incluir el registro de este evento?",
    keyConcepts: [
      { label: "sitio, fecha y hora", synonyms: ["sitio", "lugar", "fecha", "hora", "brazo", "antebrazo"] },
      { label: "signos observados y grado según escala", synonyms: ["signo", "eritema", "edema", "dolor", "grado", "escala", "maddox", "vip"] },
      { label: "acciones realizadas", synonyms: ["retir", "accion", "intervencion", "elev", "suspend", "deten"] },
      { label: "comunicación al médico / notificación", synonyms: ["medico", "avis", "comunic", "notific"] },
      { label: "seguimiento / reevaluación del sitio", synonyms: ["seguimiento", "reevalu", "control", "vigil"] },
    ],
    minConcepts: 3,
    explanation:
      "Registro: sitio, fecha y hora; tipo de catéter y solución; signos y grado según escala; acciones realizadas (suspensión, retiro, medidas locales); comunicación al médico y notificación si corresponde; plan de seguimiento del sitio.",
  },
];
