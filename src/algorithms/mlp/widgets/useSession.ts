import { useSyncExternalStore } from 'react'
import type { TrainingSession } from '../engine/session'

/** Re-renderiza o componente sempre que a sessão de treino avança. */
export function useSession(session: TrainingSession): number {
  return useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)
}
