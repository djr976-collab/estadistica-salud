import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { AI_MODEL, SAFETY_RULES, aiEnabled, getClient } from "@/lib/server/ai";
import { checkAndConsume, clientIp } from "@/lib/server/limits";

export const dynamic = "force-dynamic";

const Body = z.object({
  moduleTitle: z.string().max(200),
  moduleId: z.string().max(40),
  level: z.enum(["basico", "intermedio", "avanzado"]),
  count: z.number().int().min(1).max(5),
  reference: z.string().max(6000).default(""),
});

const Generated = z.object({
  questions: z.array(
    z.object({
      type: z.enum(["mcq", "tf"]),
      prompt: z.string(),
      options: z.array(z.string()).describe("4 opciones para mcq; vacío para tf"),
      answer: z.number().int().describe("índice correcto (mcq); -1 para tf"),
      tfAnswer: z.boolean().describe("valor correcto para tf; false para mcq"),
      explanation: z.string(),
      criticalOptions: z.array(z.number().int()).describe("índices de opciones que implican riesgo grave para el paciente"),
      needsValidation: z.string().describe("Qué debe verificar el docente contra protocolo/bibliografía, o cadena vacía"),
    }),
  ),
});

export async function POST(req: Request) {
  if (!aiEnabled()) return NextResponse.json({ error: "IA no configurada. Cargá ANTHROPIC_API_KEY en el servidor." }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  const limit = checkAndConsume(clientIp(req));
  if (!limit.ok) return NextResponse.json({ error: limit.reason }, { status: 429 });
  const b = parsed.data;

  try {
    const response = await getClient().beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 6000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(Generated) },
      system: `${SAFETY_RULES}\nTu tarea: proponer preguntas NUEVAS para el banco, que luego un docente revisará antes de publicarlas. No incluyas cálculos de dosis (se generan por un motor determinista). Evitá enunciados mecánicos o repetidos; priorizá razonamiento clínico y seguridad del paciente.`,
      messages: [
        {
          role: "user",
          content: `Módulo: ${b.moduleTitle}\nNivel: ${b.level}\nCantidad: ${b.count}\n${
            b.reference
              ? `Bibliografía/currícula validada por docentes (usala como fuente principal):\n<referencia>\n${b.reference}\n</referencia>`
              : "No hay bibliografía adjunta: limitate a contenidos de amplio consenso y marcá en needsValidation lo que deba verificarse."
          }`,
        },
      ],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) return NextResponse.json({ error: "La IA no generó preguntas" }, { status: 422 });

    const now = Date.now();
    const questions = response.parsed_output.questions.map((g, i) => ({
      id: `ia-${now}-${i}`,
      moduleId: b.moduleId,
      level: b.level,
      type: g.type,
      prompt: g.prompt,
      options: g.type === "mcq" ? g.options : undefined,
      answer: g.type === "mcq" ? g.answer : undefined,
      tfAnswer: g.type === "tf" ? g.tfAnswer : undefined,
      explanation: g.explanation,
      reference: g.needsValidation ? `A validar: ${g.needsValidation}` : undefined,
      critical:
        g.type === "mcq" && g.criticalOptions.length
          ? {
              options: g.criticalOptions,
              risk: "Opción marcada por la IA como riesgosa para el paciente. El docente debe redactar el riesgo antes de aprobar.",
              recovery: {
                prompt: "Recuperación obligatoria: ¿cuál es la conducta segura?",
                options: [g.options[g.answer] ?? "", g.options[g.criticalOptions[0]] ?? ""],
                answer: 0,
                explanation: g.explanation,
              },
            }
          : undefined,
      origin: "ia-aprobada",
    }));
    return NextResponse.json({ questions });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "IA saturada, probá en unos minutos" }, { status: 429 });
    if (err instanceof Anthropic.APIError) return NextResponse.json({ error: `Error de IA (${err.status})` }, { status: 502 });
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
