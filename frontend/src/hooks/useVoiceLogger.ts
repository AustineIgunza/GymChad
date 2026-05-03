import { useState, useRef, useCallback, useEffect } from 'react'

export interface VoiceLogger {
  isListening: boolean
  transcript: string
  startListening: () => void
  stopListening: () => void
  isSupported: boolean
}

// ── Web Speech API minimal typings ─────────────────────────────────────────────
// These are part of the browser DOM but not always included depending on tsconfig.
interface SpeechRecognitionResultItem {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResult {
  readonly length: number
  readonly isFinal: boolean
  [index: number]: SpeechRecognitionResultItem
}

interface SpeechRecognitionResultList {
  readonly length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: Event) => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  start(): void
  stop(): void
  abort(): void
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

export function useVoiceLogger(): VoiceLogger {
  const isSupported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition ?? window.webkitSpeechRecognition)

  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')

  // Clean up on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  const startListening = useCallback(() => {
    if (!isSupported) return

    const SpeechRecognitionAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) return

    // Reset previous transcript
    setTranscript('')

    const recognition = new SpeechRecognitionAPI()
    recognitionRef.current = recognition

    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          final += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }
      setTranscript(final || interim)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }, [isSupported])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  return { isListening, transcript, startListening, stopListening, isSupported }
}
