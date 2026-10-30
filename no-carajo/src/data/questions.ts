import type { Question } from "@/lib/types";

/**
 * Banco oficial inicial (prototipo).
 * Contenido de nivel introductorio basado en conceptos de amplio consenso.
 * IMPORTANTE: antes del uso institucional, cada ítem debe ser revisado por el
 * equipo docente y contrastado con los protocolos locales vigentes.
 */
export const QUESTIONS: Question[] = [
  // ───────────── 1. ANATOMÍA Y FISIOLOGÍA ─────────────
  {
    id: "ana-01",
    moduleId: "anatomia",
    level: "basico",
    type: "mcq",
    prompt: "¿En qué estructura del aparato respiratorio se produce el intercambio gaseoso entre el aire y la sangre?",
    altPrompt: "El O₂ pasa del aire a la sangre en una estructura específica del pulmón. ¿Cuál?",
    options: ["Bronquios principales", "Alvéolos pulmonares", "Tráquea", "Pleura visceral"],
    answer: 1,
    explanation:
      "El intercambio gaseoso ocurre en la membrana alvéolo-capilar: el O₂ difunde del alvéolo al capilar y el CO₂ en sentido inverso. Bronquios y tráquea son vías de conducción (espacio muerto anatómico).",
    reference: "Fisiología respiratoria básica — bibliografía de cátedra.",
  },
  {
    id: "ana-02",
    moduleId: "anatomia",
    level: "intermedio",
    type: "mcq",
    prompt: "¿Cuál es la diferencia correcta entre hipoxemia e hipoxia?",
    altPrompt: "Un compañero dice que hipoxemia e hipoxia son lo mismo. ¿Cuál es la distinción correcta?",
    options: [
      "Son sinónimos: ambas significan saturación baja",
      "Hipoxemia es el déficit de O₂ en los tejidos; hipoxia es el O₂ bajo en sangre arterial",
      "Hipoxemia es la disminución del O₂ en sangre arterial; hipoxia es el aporte insuficiente de O₂ a los tejidos",
      "Hipoxia sólo ocurre en la altura y la hipoxemia sólo en pacientes con EPOC",
    ],
    answer: 2,
    explanation:
      "Hipoxemia: PaO₂/SaO₂ disminuida en sangre arterial. Hipoxia: oxigenación tisular insuficiente. Puede haber hipoxia sin hipoxemia (p. ej., anemia grave, intoxicación por CO, shock).",
    reference: "Fisiología respiratoria — bibliografía de cátedra.",
  },
  {
    id: "ana-03",
    moduleId: "anatomia",
    level: "intermedio",
    type: "open",
    prompt: "Explicá con tus palabras qué es la hipoxia y en qué se diferencia de la hipoxemia.",
    keyConcepts: [
      { label: "hipoxemia = O₂ bajo en sangre (arterial)", synonyms: ["sangre", "arterial", "pao2", "sao2", "saturacion", "en la sangre"] },
      { label: "hipoxia = O₂ insuficiente en tejidos/células", synonyms: ["tejido", "tejidos", "celula", "celulas", "organos", "tisular"] },
    ],
    minConcepts: 2,
    explanation:
      "Hipoxemia se refiere al contenido/presión de O₂ en sangre arterial; hipoxia, a que los tejidos no reciben el O₂ que necesitan. No siempre van juntas.",
  },
  {
    id: "ana-04",
    moduleId: "anatomia",
    level: "basico",
    type: "tf",
    prompt: "Verdadero o falso: el ventrículo izquierdo bombea sangre oxigenada hacia la aorta y la circulación sistémica.",
    tfAnswer: true,
    explanation:
      "Correcto: aurícula izquierda → ventrículo izquierdo → aorta → circulación sistémica. El ventrículo derecho envía sangre desoxigenada a la arteria pulmonar.",
  },

  // ───────────── 2. BIOSEGURIDAD ─────────────
  {
    id: "bio-01",
    moduleId: "bioseguridad",
    level: "basico",
    type: "mcq",
    prompt: "Según la OMS, ¿cuál de las siguientes NO es uno de los 5 momentos de la higiene de manos?",
    altPrompt: "De estos momentos, ¿cuál NO forma parte de los 5 momentos de higiene de manos de la OMS?",
    options: [
      "Antes del contacto con el paciente",
      "Después del contacto con el entorno del paciente",
      "Antes de ingresar al vestuario del personal",
      "Después del riesgo de exposición a fluidos corporales",
    ],
    answer: 2,
    explanation:
      "Los 5 momentos son: 1) antes del contacto con el paciente, 2) antes de una tarea limpia/aséptica, 3) después del riesgo de exposición a fluidos, 4) después del contacto con el paciente, 5) después del contacto con el entorno del paciente.",
    reference: "OMS — Mis 5 momentos para la higiene de las manos.",
  },
  {
    id: "bio-02",
    moduleId: "bioseguridad",
    level: "basico",
    type: "tf",
    prompt: "Verdadero o falso: usar guantes reemplaza la higiene de manos.",
    tfAnswer: false,
    explanation:
      "Falso. Los guantes pueden tener microperforaciones y las manos se contaminan al retirarlos. Se realiza higiene de manos antes de colocarlos (si corresponde según el momento) y siempre después de retirarlos.",
    reference: "OMS — Guía sobre higiene de manos en la atención de la salud.",
  },
  {
    id: "bio-03",
    moduleId: "bioseguridad",
    level: "intermedio",
    type: "mcq",
    prompt: "Paciente con sospecha de tuberculosis pulmonar bacilífera. ¿Qué tipo de precauciones y protección respiratoria corresponde al personal?",
    options: [
      "Precauciones de contacto con barbijo quirúrgico",
      "Precauciones por gotas con barbijo quirúrgico",
      "Precauciones aéreas (respiratorias) con respirador N95 o equivalente",
      "Sólo precauciones estándar",
    ],
    answer: 2,
    explanation:
      "La TB pulmonar se transmite por núcleos de gotitas (aerosoles). Requiere precauciones aéreas: habitación individual (idealmente con presión negativa), puerta cerrada y respirador N95/FFP2 para el personal. Al paciente, barbijo quirúrgico en traslados.",
    reference: "Precauciones basadas en la transmisión — validar con el Comité de Control de Infecciones local.",
  },
  {
    id: "bio-04",
    moduleId: "bioseguridad",
    level: "intermedio",
    type: "mcq",
    prompt: "¿Cuánto debe durar, aproximadamente, la fricción de manos con solución alcohólica según la OMS?",
    options: ["5 a 10 segundos", "20 a 30 segundos", "2 minutos", "Lo que tarde en secarse, sin importar si son 5 segundos"],
    answer: 1,
    explanation:
      "La OMS indica 20–30 s para la fricción con solución alcohólica, cubriendo todas las superficies. El lavado con agua y jabón lleva 40–60 s.",
    reference: "OMS — Técnica de higiene de manos.",
  },
  {
    id: "bio-05",
    moduleId: "bioseguridad",
    level: "avanzado",
    type: "mcq",
    prompt: "Te pinchás con una aguja usada en un paciente. ¿Cuál es la primera conducta correcta?",
    options: [
      "Exprimir con fuerza la zona y aplicar lavandina pura",
      "Lavar con agua y jabón, no frotar ni exprimir, y notificar de inmediato según el protocolo de accidentes con material biológico",
      "Terminar el turno y consultar al día siguiente",
      "Recapuchar la aguja para no volver a pincharse y seguir trabajando",
    ],
    answer: 1,
    critical: {
      options: [2, 3],
      risk:
        "Demorar la notificación puede impedir la profilaxis post-exposición en el tiempo útil. Recapuchar agujas es una causa frecuente de nuevos accidentes.",
      recovery: {
        prompt: "Recuperación obligatoria: ¿por qué la notificación del accidente con material biológico debe ser inmediata?",
        options: [
          "Por un trámite administrativo sin impacto clínico",
          "Porque la eventual profilaxis post-exposición tiene una ventana de tiempo limitada",
          "Porque así se sanciona al trabajador",
        ],
        answer: 1,
        explanation:
          "La evaluación del riesgo y la eventual profilaxis post-exposición dependen del tiempo transcurrido. Notificar rápido protege al trabajador.",
      },
    },
    explanation:
      "Lavado con agua y jabón (mucosas: irrigar con agua o solución fisiológica), sin exprimir ni usar sustancias cáusticas, y notificación inmediata para evaluación del riesgo y eventual profilaxis. Nunca recapuchar.",
    reference: "Protocolo de accidentes con material biológico — validar con normativa institucional vigente.",
  },

  // ───────────── 3. HIGIENE Y CONFORT ─────────────
  {
    id: "hig-01",
    moduleId: "higiene",
    level: "basico",
    type: "mcq",
    prompt: "¿Qué valora la escala de Braden?",
    options: [
      "El nivel de conciencia",
      "El riesgo de desarrollar lesiones por presión",
      "El riesgo de caídas",
      "La intensidad del dolor",
    ],
    answer: 1,
    explanation:
      "Braden valora riesgo de lesiones por presión mediante seis subescalas: percepción sensorial, humedad, actividad, movilidad, nutrición y fricción/cizallamiento. A menor puntaje, mayor riesgo.",
  },
  {
    id: "hig-02",
    moduleId: "higiene",
    level: "basico",
    type: "tf",
    prompt: "Verdadero o falso: en el baño en cama se higieniza de las zonas más limpias a las más sucias.",
    tfAnswer: true,
    explanation:
      "Verdadero: se avanza de lo más limpio a lo más contaminado (habitualmente en sentido cefalocaudal, con la zona perineal al final), cambiando el agua cuando corresponde, para evitar trasladar microorganismos.",
  },
  {
    id: "hig-03",
    moduleId: "higiene",
    level: "intermedio",
    type: "open",
    prompt: "Nombrá al menos tres medidas de enfermería para prevenir lesiones por presión en un paciente postrado.",
    keyConcepts: [
      { label: "cambios de posición / rotación programada", synonyms: ["cambio de posicion", "cambios de posicion", "rotar", "rotacion", "movilizar", "decubito", "rotaciones"] },
      { label: "superficies de alivio de presión", synonyms: ["colchon", "superficie", "antiescaras", "almohada", "alivio de presion", "redistribucion"] },
      { label: "cuidado de la piel / control de humedad", synonyms: ["piel seca", "humedad", "hidratar", "hidratacion de la piel", "cuidado de la piel", "incontinencia", "crema"] },
      { label: "valoración del riesgo (p. ej., Braden) e inspección", synonyms: ["braden", "valorar", "valoracion", "inspeccion", "inspeccionar", "escala"] },
      { label: "nutrición e hidratación", synonyms: ["nutricion", "alimentacion", "proteinas", "hidratacion"] },
    ],
    minConcepts: 3,
    explanation:
      "Medidas clave: valoración de riesgo e inspección diaria de la piel, cambios posturales programados según riesgo, superficies de redistribución de presión, manejo de la humedad, protección de prominencias y soporte nutricional.",
  },

  // ───────────── 4. SIGNOS VITALES ─────────────
  {
    id: "sv-01",
    moduleId: "signos",
    level: "basico",
    type: "mcq",
    prompt: "¿Cuál es el rango habitual de frecuencia respiratoria en un adulto en reposo?",
    altPrompt: "Un adulto sano en reposo: ¿cuántas respiraciones por minuto esperás encontrar?",
    options: ["6 a 10 rpm", "12 a 20 rpm", "22 a 30 rpm", "30 a 40 rpm"],
    answer: 1,
    explanation:
      "En adultos, 12–20 rpm se considera el rango habitual. La taquipnea es uno de los signos más precoces de deterioro clínico y suele ser subvalorada en los registros.",
  },
  {
    id: "sv-02",
    moduleId: "signos",
    level: "basico",
    type: "mcq",
    prompt: "¿Cuál es el rango habitual de frecuencia cardíaca en un adulto en reposo?",
    options: ["40 a 50 lpm", "60 a 100 lpm", "100 a 140 lpm", "Cualquier valor si el paciente está tranquilo"],
    answer: 1,
    explanation: "60–100 lpm. Por debajo hablamos de bradicardia y por encima de taquicardia, siempre interpretadas en contexto clínico.",
  },
  {
    id: "sv-03",
    moduleId: "signos",
    level: "intermedio",
    type: "mcq",
    prompt:
      "Postoperatorio inmediato: PA 85/50 mmHg (antes 125/80), FC 122 lpm, piel fría y pálida, apósito con sangrado. ¿Qué interpretación es más prioritaria?",
    options: [
      "Ansiedad postoperatoria: tranquilizar y reevaluar en 4 horas",
      "Signos compatibles con hipovolemia/hemorragia: avisar de inmediato al médico y actuar según protocolo",
      "Es efecto esperable de la anestesia, no requiere acción",
      "Hipertermia maligna",
    ],
    answer: 1,
    critical: {
      options: [0, 2],
      risk:
        "Hipotensión + taquicardia + piel fría con sangrado sugieren shock hipovolémico. Esperar puede llevar a hipoperfusión de órganos y muerte.",
      recovery: {
        prompt: "Recuperación obligatoria: ¿qué indica la combinación hipotensión + taquicardia + piel fría en un postoperado?",
        options: [
          "Probable compromiso hemodinámico que requiere aviso y acción inmediata",
          "Un paciente que necesita dormir",
          "Un error del tensiómetro, siempre",
        ],
        answer: 0,
        explanation:
          "La taquicardia es un mecanismo compensador; cuando además cae la PA, la compensación está fallando. Se avisa, se monitoriza y se actúa según indicación/protocolo.",
      },
    },
    explanation:
      "Taquicardia compensadora, caída de la PA, vasoconstricción periférica y sangrado visible orientan a hipovolemia. Prioridad: aviso inmediato, control seriado de signos vitales, valorar el apósito y preparar acciones indicadas.",
  },
  {
    id: "sv-04",
    moduleId: "signos",
    level: "intermedio",
    type: "tf",
    prompt: "Verdadero o falso: una saturación de 97% descarta que el paciente esté en dificultad respiratoria.",
    tfAnswer: false,
    explanation:
      "Falso. Un paciente puede mantener saturación a costa de mayor trabajo respiratorio (taquipnea, tiraje, uso de musculatura accesoria) o recibiendo O₂. La saturación se interpreta junto con FR, trabajo respiratorio y estado de conciencia.",
  },

  // ───────────── 5. FARMACOLOGÍA ─────────────
  {
    id: "far-01",
    moduleId: "farmaco",
    level: "basico",
    type: "open",
    prompt: "Nombrá los «cinco correctos» de la administración de medicamentos.",
    altPrompt: "Antes de administrar, ¿qué cinco verificaciones (los cinco correctos) tenés que hacer?",
    keyConcepts: [
      { label: "paciente correcto", synonyms: ["paciente", "persona", "identificacion"] },
      { label: "medicamento correcto", synonyms: ["medicamento", "farmaco", "droga", "medicacion"] },
      { label: "dosis correcta", synonyms: ["dosis", "cantidad"] },
      { label: "vía correcta", synonyms: ["via"] },
      { label: "hora correcta", synonyms: ["hora", "horario", "momento", "tiempo", "frecuencia"] },
    ],
    minConcepts: 5,
    explanation:
      "Paciente, medicamento, dosis, vía y hora correctos. Muchas instituciones amplían a más correctos (registro, educación, derecho a rechazar, respuesta esperada, fecha de vencimiento…). Validá cuál usa tu institución.",
  },
  {
    id: "far-02",
    moduleId: "farmaco",
    level: "intermedio",
    type: "mcq",
    prompt:
      "El paciente refiere alergia a la penicilina y la indicación médica dice amoxicilina VO. ¿Qué hacés?",
    options: [
      "La administro: si el médico la indicó, es su responsabilidad",
      "No la administro, informo de inmediato al médico tratante, registro la alergia y la situación",
      "Administro media dosis para ver cómo reacciona",
      "Le doy un antihistamínico antes y la administro",
    ],
    answer: 1,
    critical: {
      options: [0, 2, 3],
      risk:
        "La amoxicilina es una penicilina. Administrarla a un paciente con alergia referida puede causar anafilaxia. Enfermería tiene responsabilidad propia en la verificación.",
      recovery: {
        prompt: "Recuperación obligatoria: ¿a qué grupo pertenece la amoxicilina?",
        options: ["Macrólidos", "Penicilinas (betalactámicos)", "Aminoglucósidos"],
        answer: 1,
        explanation:
          "La amoxicilina es una aminopenicilina. Ante alergia a penicilina se suspende la administración, se comunica y se registra; la decisión terapéutica alternativa es médica.",
      },
    },
    explanation:
      "La amoxicilina es una penicilina. Ante una alergia referida: no administrar, comunicar al médico, registrar en la historia clínica, identificar al paciente (p. ej., pulsera de alergia según protocolo).",
  },
  {
    id: "far-03",
    moduleId: "farmaco",
    level: "avanzado",
    type: "mcq",
    prompt: "Hay una indicación de cloruro de potasio (KCl) endovenoso. ¿Cuál es la forma segura de administrarlo?",
    options: [
      "En bolo endovenoso directo para corregir rápido",
      "Diluido según prescripción, en infusión controlada (idealmente con bomba) y con doble verificación según protocolo",
      "Por vía intramuscular",
      "Diluido en 2 mL de agua destilada, en push lento",
    ],
    answer: 1,
    critical: {
      options: [0, 3],
      risk:
        "El KCl concentrado administrado en bolo puede producir arritmias graves y paro cardíaco. Es un medicamento de alto riesgo.",
      recovery: {
        prompt: "Recuperación obligatoria: ¿por qué el KCl concentrado es considerado un medicamento de alto riesgo?",
        options: [
          "Porque es caro",
          "Porque un error en su administración (p. ej., bolo) puede causar arritmias graves o paro cardíaco",
          "Porque mancha la ropa",
        ],
        answer: 1,
        explanation:
          "Los medicamentos de alto riesgo son aquellos cuyo error causa daño grave. Para el KCl: almacenamiento diferenciado, dilución, bomba de infusión y doble verificación.",
      },
    },
    explanation:
      "El KCl EV nunca se administra en bolo. Se diluye según prescripción, se infunde con control de velocidad y se aplican barreras de seguridad (almacenamiento separado, rotulado, doble chequeo). Concentraciones y velocidades: según protocolo institucional.",
    reference: "Medicamentos de alto riesgo — validar con el protocolo de farmacia local.",
  },
  {
    id: "far-04",
    moduleId: "farmaco",
    level: "basico",
    type: "tf",
    prompt: "Verdadero o falso: si un medicamento no se administró, se registra igual como «administrado» para no dejar el casillero vacío.",
    tfAnswer: false,
    critical: {
      tfValue: true,
      risk:
        "Registrar algo no realizado es una falta grave: genera decisiones clínicas erróneas (p. ej., otra persona puede repetir o no reponer la dosis) y compromete la responsabilidad legal.",
      recovery: {
        prompt: "Recuperación obligatoria: si una dosis no se administró, ¿qué corresponde?",
        options: [
          "Dejarlo en blanco y no avisar",
          "Registrar que no se administró, el motivo, y comunicarlo según corresponda",
          "Marcarla como administrada y darla en el próximo turno doble",
        ],
        answer: 1,
        explanation: "El registro debe reflejar lo que realmente ocurrió: omisión, motivo y comunicación al equipo.",
      },
    },
    explanation:
      "Falso. Se registra lo que ocurrió: dosis no administrada, motivo (rechazo, ayuno, ausencia del paciente, falta de insumo) y comunicación al equipo.",
  },

  // ───────────── 6. CÁLCULOS (resueltos por motor determinista) ─────────────
  {
    id: "cal-01",
    moduleId: "calculos",
    level: "basico",
    type: "calc",
    prompt: "Goteo con macrogotero",
    calc: {
      template:
        "Indicación: {volumeMl} mL de solución fisiológica a pasar en {hours} horas con macrogotero (20 gotas/mL). ¿Cuántas gotas por minuto programás? (redondeá al entero)",
      base: { kind: "goteo", volumeMl: 1000, hours: 8, dropFactor: 20 },
      variants: [
        { kind: "goteo", volumeMl: 500, hours: 6, dropFactor: 20 },
        { kind: "goteo", volumeMl: 1500, hours: 24, dropFactor: 20 },
        { kind: "goteo", volumeMl: 1000, hours: 12, dropFactor: 20 },
      ],
    },
    explanation:
      "Fórmula: gotas/min = volumen (mL) × factor de goteo (gotas/mL) ÷ tiempo (min). Regla práctica con macrogotero: gotas/min ≈ mL/h ÷ 3.",
  },
  {
    id: "cal-02",
    moduleId: "calculos",
    level: "intermedio",
    type: "calc",
    prompt: "Goteo con microgotero",
    calc: {
      template:
        "Indicación: {volumeMl} mL en {hours} horas con microgotero (60 microgotas/mL). ¿Cuántas microgotas por minuto? (redondeá al entero)",
      base: { kind: "goteo", volumeMl: 500, hours: 24, dropFactor: 60 },
      variants: [
        { kind: "goteo", volumeMl: 250, hours: 10, dropFactor: 60 },
        { kind: "goteo", volumeMl: 1000, hours: 24, dropFactor: 60 },
      ],
    },
    explanation: "Con microgotero (60 microgotas/mL), microgotas/min = mL/h. Fórmula general: volumen × 60 ÷ minutos.",
  },
  {
    id: "cal-03",
    moduleId: "calculos",
    level: "basico",
    type: "calc",
    prompt: "Dosis a cargar",
    calc: {
      template:
        "Indicación: {orderedMg} mg EV. Disponés de un frasco de {stockMg} mg diluido en {stockMl} mL. ¿Cuántos mL cargás?",
      base: { kind: "dosis", orderedMg: 500, stockMg: 1000, stockMl: 10 },
      variants: [
        { kind: "dosis", orderedMg: 250, stockMg: 1000, stockMl: 5 },
        { kind: "dosis", orderedMg: 750, stockMg: 1000, stockMl: 10 },
        { kind: "dosis", orderedMg: 40, stockMg: 20, stockMl: 2 },
      ],
    },
    explanation: "Regla de tres: mL = dosis indicada × volumen disponible ÷ dosis disponible. Verificá siempre unidades (mg vs g vs mcg).",
  },
  {
    id: "cal-04",
    moduleId: "calculos",
    level: "intermedio",
    type: "calc",
    prompt: "Programación de bomba",
    calc: {
      template: "Hay que pasar {volumeMl} mL en {hours} horas con bomba de infusión. ¿A cuántos mL/h la programás? (redondeá a un decimal)",
      base: { kind: "mlh", volumeMl: 1000, hours: 8 },
      variants: [
        { kind: "mlh", volumeMl: 500, hours: 4 },
        { kind: "mlh", volumeMl: 100, hours: 0.5 },
        { kind: "mlh", volumeMl: 250, hours: 3 },
      ],
    },
    explanation: "mL/h = volumen total (mL) ÷ tiempo (h). Si el tiempo está en minutos, primero convertilo a horas.",
  },

  // ───────────── 7. OXIGENOTERAPIA ─────────────
  {
    id: "oxi-01",
    moduleId: "oxigeno",
    level: "basico",
    type: "mcq",
    prompt: "¿Cuál es el rango de flujo habitualmente recomendado para la cánula nasal convencional en adultos?",
    options: ["1 a 6 L/min", "10 a 15 L/min", "20 a 40 L/min", "No tiene límite"],
    answer: 0,
    explanation:
      "La cánula nasal convencional suele usarse entre 1 y 6 L/min. Flujos mayores resecan mucosas sin aumentar de forma útil la FiO₂; si se requiere más O₂ se cambia de dispositivo según indicación.",
  },
  {
    id: "oxi-02",
    moduleId: "oxigeno",
    level: "intermedio",
    type: "mcq",
    prompt: "Paciente con EPOC e hipercapnia crónica conocida. ¿Qué rango objetivo de saturación suele indicarse?",
    options: ["100%, cuanto más mejor", "88–92%", "70–75%", "95–98% siempre, sin excepción"],
    answer: 1,
    explanation:
      "En pacientes con riesgo de insuficiencia respiratoria hipercápnica, las guías suelen fijar un objetivo de 88–92%, porque el exceso de O₂ puede empeorar la retención de CO₂. El objetivo concreto lo indica el equipo tratante.",
    reference: "Guías de oxigenoterapia en adultos (p. ej., BTS) — validar con protocolo local.",
  },
  {
    id: "oxi-03",
    moduleId: "oxigeno",
    level: "basico",
    type: "tf",
    prompt: "Verdadero o falso: el oxígeno es un medicamento y requiere indicación, dosis (flujo/FiO₂) y registro.",
    tfAnswer: true,
    explanation: "Verdadero. El O₂ se prescribe, se administra con dispositivo y flujo definidos, se monitoriza (SatO₂, FR, trabajo respiratorio) y se registra.",
  },

  // ───────────── 8. PAE ─────────────
  {
    id: "pae-01",
    moduleId: "pae",
    level: "basico",
    type: "mcq",
    prompt: "¿Cuál es el orden correcto de las etapas del Proceso de Atención de Enfermería?",
    options: [
      "Diagnóstico, valoración, ejecución, planificación, evaluación",
      "Valoración, diagnóstico, planificación, ejecución, evaluación",
      "Planificación, valoración, diagnóstico, evaluación, ejecución",
      "Valoración, ejecución, diagnóstico, evaluación, planificación",
    ],
    answer: 1,
    explanation:
      "Valoración → diagnóstico → planificación → ejecución → evaluación. Es un proceso cíclico: la evaluación retroalimenta una nueva valoración.",
  },
  {
    id: "pae-02",
    moduleId: "pae",
    level: "basico",
    type: "tf",
    prompt: "Verdadero o falso: «El paciente refiere dolor 7/10 en zona abdominal» es un dato subjetivo.",
    tfAnswer: true,
    explanation:
      "Verdadero. Lo que el paciente expresa (síntomas, percepciones) es subjetivo. Lo que la enfermera observa o mide (FC, temperatura, facies de dolor) es objetivo. Ambos se registran.",
  },
  {
    id: "pae-03",
    moduleId: "pae",
    level: "intermedio",
    type: "open",
    prompt: "¿Qué características debe tener un objetivo (resultado esperado) bien formulado en el plan de cuidados?",
    keyConcepts: [
      { label: "centrado en el paciente", synonyms: ["paciente", "centrado"] },
      { label: "medible / observable", synonyms: ["medible", "observable", "cuantificable", "evaluable", "indicador"] },
      { label: "con plazo definido", synonyms: ["plazo", "tiempo", "fecha", "horas", "dias", "temporal"] },
      { label: "realista / alcanzable", synonyms: ["realista", "alcanzable", "posible", "factible"] },
    ],
    minConcepts: 3,
    explanation:
      "Un buen objetivo está centrado en el paciente, es medible/observable, realista y tiene plazo. Ej.: «El paciente referirá dolor ≤3/10 dentro de las 2 h posteriores a la intervención».",
  },

  // ───────────── 9. PERIOPERATORIO ─────────────
  {
    id: "per-01",
    moduleId: "periop",
    level: "basico",
    type: "mcq",
    prompt: "¿Cuáles son los tres momentos de la Lista de Verificación de la Seguridad de la Cirugía de la OMS?",
    options: [
      "Ingreso, internación y alta",
      "Entrada (antes de la inducción), pausa quirúrgica (antes de la incisión) y salida (antes de que el paciente salga del quirófano)",
      "Preanestesia, anestesia y recuperación",
      "Sólo al final de la cirugía",
    ],
    answer: 1,
    explanation:
      "Entrada (sign in), pausa quirúrgica (time out) y salida (sign out). Verifica identidad, sitio, procedimiento, alergias, riesgos y recuento de material, entre otros.",
    reference: "OMS — Lista de verificación de la seguridad de la cirugía.",
  },
  {
    id: "per-02",
    moduleId: "periop",
    level: "intermedio",
    type: "mcq",
    prompt: "En el postoperatorio inmediato, ¿cuál es la prioridad de valoración inicial?",
    options: [
      "Permeabilidad de la vía aérea, respiración y circulación",
      "Completar el inventario de pertenencias",
      "Indicar la dieta",
      "Hacer la higiene completa del paciente",
    ],
    answer: 0,
    explanation:
      "Primero vía aérea, ventilación y circulación (ABC), luego nivel de conciencia, dolor, herida/drenajes, diuresis y temperatura.",
  },

  // ───────────── 10. URGENCIAS ─────────────
  {
    id: "urg-01",
    moduleId: "urgencias",
    level: "basico",
    type: "mcq",
    prompt: "En la RCP de un adulto, ¿qué frecuencia y profundidad de compresiones se recomiendan?",
    options: ["60–80/min, 2–3 cm", "100–120/min, 5–6 cm", "140–160/min, 8–10 cm", "Lo más lento posible para no lastimar"],
    answer: 1,
    explanation:
      "100–120 compresiones/min, 5–6 cm de profundidad, permitiendo la reexpansión completa del tórax y minimizando interrupciones.",
    reference: "Guías de RCP vigentes (AHA/ERC) — verificar actualización.",
  },
  {
    id: "urg-02",
    moduleId: "urgencias",
    level: "intermedio",
    type: "mcq",
    prompt: "Encontrás a un paciente que no responde y no respira con normalidad. ¿Qué hacés primero?",
    options: [
      "Voy a buscar al médico y espero a que llegue para empezar",
      "Pido ayuda/activo el código de emergencia, solicito el desfibrilador e inicio RCP de inmediato",
      "Le tomo la temperatura",
      "Lo dejo descansar y reevalúo en 15 minutos",
    ],
    answer: 1,
    critical: {
      options: [0, 3],
      risk: "Cada minuto sin RCP ni desfibrilación reduce de forma marcada la probabilidad de sobrevida.",
      recovery: {
        prompt: "Recuperación obligatoria: ante un paciente que no responde y no respira con normalidad…",
        options: [
          "Se activa la emergencia y se inicia RCP sin demora",
          "Se espera a tener todos los estudios",
          "Se lo deja en observación",
        ],
        answer: 0,
        explanation: "Reconocer, pedir ayuda e iniciar compresiones de alta calidad es lo que salva vidas. El DEA se usa apenas esté disponible.",
      },
    },
    explanation:
      "Reconocimiento del paro → activar sistema de emergencia → pedir el DEA/desfibrilador → iniciar compresiones de alta calidad de inmediato.",
  },
  {
    id: "urg-03",
    moduleId: "urgencias",
    level: "basico",
    type: "tf",
    prompt: "Verdadero o falso: ante una hemorragia externa abundante, la primera medida es la compresión directa sobre la herida.",
    tfAnswer: true,
    explanation: "Verdadero. La compresión directa y sostenida es la primera medida; luego se evalúan otras según protocolo (vendaje compresivo, torniquete en extremidades si está indicado).",
  },

  // ───────────── 11. SEGURIDAD DEL PACIENTE ─────────────
  {
    id: "seg-01",
    moduleId: "seguridad",
    level: "basico",
    type: "mcq",
    prompt: "¿Cuál es la forma correcta de identificar al paciente antes de un procedimiento?",
    options: [
      "Por el número de cama",
      "Con al menos dos identificadores (p. ej., nombre completo y fecha de nacimiento o N° de historia clínica), verificando con la pulsera",
      "Preguntando «¿Usted es el señor García?»",
      "Por el diagnóstico",
    ],
    answer: 1,
    critical: {
      options: [0, 3],
      risk:
        "Los pacientes cambian de cama y varios pueden compartir diagnóstico. Una identificación errónea puede llevar a administrar medicación, sangre o procedimientos a la persona equivocada.",
      recovery: {
        prompt: "Recuperación obligatoria: ¿cuántos identificadores como mínimo se usan para identificar a un paciente?",
        options: ["Uno, el número de cama", "Al menos dos, que no sean la cama ni la habitación", "Ninguno si lo conozco"],
        answer: 1,
        explanation: "Al menos dos identificadores personales, preguntando de forma abierta («¿Cómo se llama?») y contrastando con la pulsera/registro.",
      },
    },
    explanation:
      "Al menos dos identificadores personales; nunca cama, habitación ni diagnóstico. Preguntar de forma abierta («¿Me dice su nombre completo?») en lugar de pregunta cerrada.",
    reference: "Metas internacionales de seguridad del paciente — validar con protocolo institucional.",
  },
  {
    id: "seg-02",
    moduleId: "seguridad",
    level: "intermedio",
    type: "tf",
    prompt: "Verdadero o falso: el objetivo principal de notificar eventos adversos es identificar y sancionar al responsable.",
    tfAnswer: false,
    explanation:
      "Falso. El objetivo es aprender del sistema y prevenir que se repita (cultura justa y no punitiva). La mayoría de los eventos tienen causas sistémicas: procesos, comunicación, carga de trabajo, diseño.",
  },
  {
    id: "seg-03",
    moduleId: "seguridad",
    level: "avanzado",
    type: "open",
    prompt: "¿Qué es la técnica SBAR (o SAER) y para qué se usa en enfermería?",
    keyConcepts: [
      { label: "comunicación estructurada / pase", synonyms: ["comunicacion", "pase", "traspaso", "informar", "estructurada", "transmitir"] },
      { label: "situación", synonyms: ["situacion"] },
      { label: "antecedentes", synonyms: ["antecedente", "background", "contexto"] },
      { label: "evaluación", synonyms: ["evaluacion", "assessment", "valoracion"] },
      { label: "recomendación", synonyms: ["recomendacion", "recommendation", "solicitud", "propuesta"] },
    ],
    minConcepts: 3,
    explanation:
      "SBAR/SAER: Situación, Antecedentes, Evaluación y Recomendación. Herramienta de comunicación estructurada para pases de guardia y para comunicar cambios del paciente al médico, reduciendo omisiones.",
  },

  // ───────────── 12. CASO INTEGRADOR (modo Guardia, progresivo) ─────────────
  {
    id: "caso-01-a",
    moduleId: "casos",
    level: "intermedio",
    type: "mcq",
    caseId: "guardia-1",
    caseStep: 1,
    caseIntro:
      "Guardia nocturna. Sr. R., 68 años, postoperatorio día 1 de cirugía abdominal. Te llaman porque «está raro». Lo encontrás inquieto, FR 28 rpm, SatO₂ 86% aire ambiente, FC 110 lpm, PA 130/80.",
    prompt: "¿Cuál es tu primera acción?",
    options: [
      "Registrar los signos vitales y seguir con la ronda",
      "Elevar la cabecera (Fowler/semi-Fowler), administrar O₂ según indicación o protocolo y avisar al médico",
      "Administrar un sedante para que se calme",
      "Esperar al pase de la mañana",
    ],
    answer: 1,
    critical: {
      options: [2, 3],
      risk: "La inquietud con hipoxemia y taquipnea puede ser signo de hipoxia cerebral. Sedarlo puede deprimir aún más la respiración; esperar retrasa el tratamiento.",
      recovery: {
        prompt: "Recuperación obligatoria: un paciente inquieto con SatO₂ 86% y FR 28 probablemente…",
        options: ["Está ansioso y necesita sedación", "Está hipoxémico y requiere oxigenación y aviso urgente", "Está aburrido"],
        answer: 1,
        explanation: "La agitación puede ser manifestación de hipoxia. Primero se trata la causa respiratoria.",
      },
    },
    explanation:
      "Prioridad: oxigenación. Posición que favorezca la ventilación, O₂ según indicación/protocolo, monitorización y comunicación inmediata (SBAR).",
  },
  {
    id: "caso-01-b",
    moduleId: "casos",
    level: "intermedio",
    type: "mcq",
    caseId: "guardia-1",
    caseStep: 2,
    prompt:
      "Con O₂ la SatO₂ sube a 93%. Al auscultar notás hipoventilación en bases. El paciente no se moviliza desde la cirugía por dolor (8/10). ¿Qué intervención de enfermería es más pertinente para el problema de fondo?",
    options: [
      "Ninguna: con 93% ya está resuelto",
      "Coordinar analgesia indicada, y luego estimular respiración profunda, tos efectiva/espirometría incentivada y movilización precoz",
      "Retirar el O₂ para que «se acostumbre»",
      "Restringir líquidos",
    ],
    answer: 1,
    explanation:
      "El dolor limita la expansión torácica y favorece atelectasias. Analgesia adecuada + fisioterapia respiratoria + movilización precoz son claves en la prevención de complicaciones pulmonares postoperatorias.",
  },
  {
    id: "caso-01-c",
    moduleId: "casos",
    level: "intermedio",
    type: "open",
    caseId: "guardia-1",
    caseStep: 3,
    prompt: "Tenés que llamar al médico de guardia. Armá la comunicación con estructura SBAR en pocas líneas.",
    keyConcepts: [
      { label: "S: situación (quién y qué pasa ahora)", synonyms: ["saturacion", "sat", "86", "hipoxemia", "inquieto", "situacion", "dificultad respiratoria"] },
      { label: "B: antecedentes (postop día 1, cirugía abdominal, edad)", synonyms: ["postoperatorio", "postop", "cirugia", "68", "abdominal", "antecedente"] },
      { label: "A: evaluación (signos vitales, hipoventilación, dolor)", synonyms: ["fr", "frecuencia", "28", "taquipnea", "hipoventilacion", "dolor", "110", "evaluacion"] },
      { label: "R: recomendación/solicitud (evaluación médica, conducta)", synonyms: ["solicito", "venga", "evalue", "valore", "recomiendo", "indicacion", "pido", "necesito"] },
    ],
    minConcepts: 3,
    explanation:
      "Ejemplo: «S: Sr. R., cama 4, desaturó a 86% AA, inquieto. B: 68 años, POP día 1 de cirugía abdominal. A: FR 28, FC 110, hipoventilación bibasal, dolor 8/10; con O₂ satura 93%. R: solicito que lo evalúe ahora y revisar la analgesia».",
  },
];
