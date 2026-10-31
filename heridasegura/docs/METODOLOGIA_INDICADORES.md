# Metodología de indicadores

Implementación: `src/lib/indicators.ts` (probada en `indicators.test.ts`). **Validar con Epidemiología / Calidad.**

| Indicador | Numerador | Denominador | Ventana |
|---|---|---|---|
| Prevalencia puntual de LPP | Pacientes con ≥ 1 LPP activa en la fecha de corte | Pacientes internados en la fecha de corte | Fecha de corte |
| Prevalencia de LPP adquirida | Ídem, solo LPP *no presentes al ingreso* | Ídem | Fecha de corte |
| Incidencia acumulada de LPP adquirida | Episodios con ≥ 1 LPP adquirida detectada en el período | Episodios internados en el período **sin** LPP presente al ingreso (población en riesgo) | Período |
| Densidad de incidencia | LPP adquiridas detectadas en el período | Pacientes-día en el período (× 1000) | Período |
| Cobertura de Braden | Internados con ≥ 1 Braden en el episodio | Internados a la fecha de corte | Fecha de corte |
| Braden vigente | Internados con Braden dentro de la vigencia configurada | Internados | Fecha de corte |
| Cumplimiento de seguimiento | Reevaluaciones realizadas antes del vencimiento | Reevaluaciones programadas que vencían en el período | Período |

Criterios:
- **Alcance:** servicio/sector filtrado. La lesión se atribuye al sector donde estaba el paciente al **detectarse**.
- **Tipos de puesto:** por defecto solo camas de internación (sala, UTI, box UTI, coronaria). Shockroom, observación y camillas se excluyen; si se incluyen, se advierte que no es comparable.
- **Origen desconocido:** las LPP sin dato verificable de presencia al ingreso se excluyen del numerador de incidencia y se informan como advertencia (posible subestimación).
- **Datos incompletos:** se advierte LPP sin categoría, lesiones sin valoración y denominadores < 30.
- Los indicadores usan solo los registros visibles para el usuario (RLS).
