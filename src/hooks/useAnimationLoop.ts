import { useEffect, useLayoutEffect, useRef } from 'react'

/** Chama `tick` a cada quadro enquanto `running` for verdadeiro. */
export function useAnimationLoop(running: boolean, tick: () => void) {
  const tickRef = useRef(tick)
  useLayoutEffect(() => {
    tickRef.current = tick
  })
  useEffect(() => {
    if (!running) return
    let id = 0
    const loop = () => {
      tickRef.current()
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [running])
}
