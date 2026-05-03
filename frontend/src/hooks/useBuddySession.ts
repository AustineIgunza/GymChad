import { useRef, useState, useCallback, useEffect } from 'react'

export interface PartnerSet {
  exercise_name: string
  weight_kg: number
  reps: number
  rpe?: number
  set_number: number
  timestamp: number // unix ms
}

export interface BuddySession {
  sessionId: string | null
  partnerSets: PartnerSet[]
  partnerExercise: string | null
  isConnected: boolean
  sendSet: (set: {
    exercise_name: string
    weight_kg: number
    reps: number
    rpe?: number
    set_number: number
  }) => void
  sendReaction: (emoji: string) => void
  sendExerciseChanged: (exercise_name: string) => void
  sendRestStarted: (duration_seconds: number) => void
  sendWorkoutEnded: () => void
  disconnect: () => void
}

interface UseBuddySessionOptions {
  sessionId: string | null
  userId: string | null
  onReaction?: (emoji: string) => void
  onPartnerRestStarted?: (duration: number) => void
  onPartnerWorkoutEnded?: () => void
}

const WS_BASE = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:8000'
const MAX_RETRIES = 3
const MAX_PARTNER_SETS = 10

export function useBuddySession({
  sessionId,
  userId,
  onReaction,
  onPartnerRestStarted,
  onPartnerWorkoutEnded,
}: UseBuddySessionOptions): BuddySession {
  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intentionalCloseRef = useRef(false)

  const [isConnected, setIsConnected] = useState(false)
  const [partnerSets, setPartnerSets] = useState<PartnerSet[]>([])
  const [partnerExercise, setPartnerExercise] = useState<string | null>(null)

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const connect = useCallback(() => {
    if (!sessionId || !userId) return
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    const url = `${WS_BASE}/api/v1/buddy/ws/${sessionId}/${userId}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      retriesRef.current = 0
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string)
        switch (msg.type) {
          case 'set_logged':
            setPartnerSets((prev) => {
              const next: PartnerSet = {
                exercise_name: msg.exercise_name,
                weight_kg: msg.weight_kg,
                reps: msg.reps,
                rpe: msg.rpe,
                set_number: msg.set_number,
                timestamp: Date.now(),
              }
              return [next, ...prev].slice(0, MAX_PARTNER_SETS)
            })
            break
          case 'exercise_changed':
            setPartnerExercise(msg.exercise_name ?? null)
            break
          case 'reaction':
            onReaction?.(msg.emoji)
            break
          case 'rest_started':
            onPartnerRestStarted?.(msg.duration_seconds)
            break
          case 'workout_ended':
            onPartnerWorkoutEnded?.()
            break
          default:
            break
        }
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = () => {
      setIsConnected(false)
    }

    ws.onclose = () => {
      setIsConnected(false)
      wsRef.current = null

      if (!intentionalCloseRef.current && retriesRef.current < MAX_RETRIES) {
        const delay = Math.pow(2, retriesRef.current) * 1000 // 1s, 2s, 4s
        retriesRef.current += 1
        retryTimerRef.current = setTimeout(() => {
          connect()
        }, delay)
      }
    }
  }, [sessionId, userId, onReaction, onPartnerRestStarted, onPartnerWorkoutEnded])

  useEffect(() => {
    if (!sessionId || !userId) return
    intentionalCloseRef.current = false
    retriesRef.current = 0
    connect()

    return () => {
      intentionalCloseRef.current = true
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [sessionId, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendSet = useCallback(
    (set: { exercise_name: string; weight_kg: number; reps: number; rpe?: number; set_number: number }) => {
      sendMessage({ type: 'set_logged', ...set })
    },
    [sendMessage]
  )

  const sendReaction = useCallback(
    (emoji: string) => {
      sendMessage({ type: 'reaction', emoji })
    },
    [sendMessage]
  )

  const sendExerciseChanged = useCallback(
    (exercise_name: string) => {
      sendMessage({ type: 'exercise_changed', exercise_name })
    },
    [sendMessage]
  )

  const sendRestStarted = useCallback(
    (duration_seconds: number) => {
      sendMessage({ type: 'rest_started', duration_seconds })
    },
    [sendMessage]
  )

  const sendWorkoutEnded = useCallback(() => {
    sendMessage({ type: 'workout_ended' })
  }, [sendMessage])

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    wsRef.current?.close()
    wsRef.current = null
    setIsConnected(false)
  }, [])

  return {
    sessionId,
    partnerSets,
    partnerExercise,
    isConnected,
    sendSet,
    sendReaction,
    sendExerciseChanged,
    sendRestStarted,
    sendWorkoutEnded,
    disconnect,
  }
}
