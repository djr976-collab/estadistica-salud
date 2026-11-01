/** Forma mínima del progreso que se sincroniza con la nube. */
export interface SyncableProgress {
  xp: number;
  bestStreak: number;
  sessions: number;
  graveCount: number;
  badges: string[];
  wrong: Record<string, number>;
  updatedAt?: number;
}

/** Fusiona el progreso local con el de la nube sin perder logros de ningún dispositivo. */
export function mergeProgress<T extends SyncableProgress>(local: T, remote: SyncableProgress): T {
  const remoteNewer = (remote.updatedAt ?? 0) > (local.updatedAt ?? 0);
  return {
    ...local,
    xp: Math.max(local.xp, remote.xp),
    bestStreak: Math.max(local.bestStreak, remote.bestStreak),
    sessions: Math.max(local.sessions, remote.sessions),
    graveCount: Math.max(local.graveCount, remote.graveCount),
    badges: [...new Set([...local.badges, ...remote.badges])],
    // La lista de Revancha no se puede sumar (se vacía al corregir): gana la más reciente.
    wrong: remoteNewer ? remote.wrong : local.wrong,
    updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0),
  };
}
