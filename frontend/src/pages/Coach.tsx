import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Loader2, Sparkles, RotateCcw } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import api from '../services/api'
import type { ChatMessage } from '../types'

const QUICK_PROMPTS = [
  { label: '📊 Review my week', text: 'Can you review my training and nutrition this week and give me feedback?' },
  { label: '💪 Suggest overload', text: 'Based on my recent workouts, which exercises should I increase the weight on?' },
  { label: '🥗 Adjust my diet', text: 'Looking at my recent nutrition logs, how should I adjust my diet?' },
  { label: '😴 Recovery advice', text: 'How is my training volume? Do I need more recovery time?' },
]

export function CoachPage() {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [currentStream, setCurrentStream] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load latest session on mount
  useEffect(() => {
    api.get('/ai/sessions')
      .then(r => {
        const sessions = r.data
        if (sessions.length > 0) {
          const latest = sessions[0]
          setSessionId(latest.id)
          setMessages(latest.messages || [])
        }
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentStream])

  const saveSession = async (msgs: ChatMessage[], sid: string | null) => {
    try {
      const res = await api.post('/ai/sessions', { session_id: sid, messages: msgs })
      setSessionId(res.data.id)
    } catch {
      // non-critical
    }
  }

  const send = async (text: string) => {
    if (!text.trim() || streaming) return
    const userMsg: ChatMessage = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)
    setCurrentStream('')

    try {
      const token = await import('../services/supabase')
        .then(m => m.supabase.auth.getSession())
        .then(s => s.data.session?.access_token || '')

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/ai/coach`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: text, history: messages, session_id: sessionId }),
        }
      )

      if (!response.body) throw new Error('No response body')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            if (data.startsWith('[ERROR]')) {
              full += '\n⚠️ ' + data.slice(7)
              break
            }
            full += data.replace(/\\n/g, '\n')
            setCurrentStream(full)
          }
        }
      }

      const finalMessages = [...newMessages, { role: 'assistant' as const, content: full }]
      setMessages(finalMessages)
      await saveSession(finalMessages, sessionId)
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: '⚠️ Something went wrong. Please try again.' }])
    } finally {
      setStreaming(false)
      setCurrentStream('')
    }
  }

  const startNewChat = () => {
    setMessages([])
    setSessionId(null)
    setCurrentStream('')
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Header */}
      <div className="pt-14 px-4 pb-4 border-b border-border bg-bg-secondary/50 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ boxShadow: ['0 0 0px rgba(220,38,38,0)', '0 0 12px rgba(220,38,38,0.3)', '0 0 0px rgba(220,38,38,0)'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-10 h-10 rounded-xl bg-primary-700/20 flex items-center justify-center"
            >
              <Bot className="w-5 h-5 text-primary-400" />
            </motion.div>
            <div>
              <h1 className="text-lg font-bold text-text-primary">AI Coach</h1>
              <div className="flex items-center gap-1.5">
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-accent-green"
                />
                <span className="text-xs text-text-muted">Powered by Claude · Knows your data</span>
              </div>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={startNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-tertiary border border-border text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              New chat
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-6">
        {loadingHistory && (
          <div className="flex justify-center py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="w-5 h-5 text-text-muted" />
            </motion.div>
          </div>
        )}

        {!loadingHistory && messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center py-12"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-16 h-16 rounded-2xl bg-primary-700/20 flex items-center justify-center mx-auto mb-4"
            >
              <Sparkles className="w-8 h-8 text-primary-400" />
            </motion.div>
            <h2 className="text-lg font-bold text-text-primary mb-2">Your AI Coach</h2>
            <p className="text-text-muted text-sm max-w-xs mx-auto">
              I analyse your actual workout data and nutrition logs to give you personalised advice.
            </p>

            {/* Quick prompts */}
            <div className="flex flex-col gap-2 mt-6 max-w-xs mx-auto">
              {QUICK_PROMPTS.map((p, i) => (
                <motion.button
                  key={p.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.07 }}
                  onClick={() => send(p.text)}
                  className="px-4 py-2.5 rounded-xl bg-bg-card border border-border text-sm text-text-secondary hover:border-primary-700/40 hover:text-text-primary hover:bg-bg-tertiary transition-all text-left"
                >
                  {p.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-primary-700' : 'bg-bg-tertiary border border-border'}`}>
                {msg.role === 'user'
                  ? <User className="w-4 h-4 text-white" />
                  : <Bot className="w-4 h-4 text-primary-400" />
                }
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-primary-700 text-white rounded-tr-sm' : 'bg-bg-card border border-border text-text-primary rounded-tl-sm'}`}>
                {msg.content}
              </div>
            </motion.div>
          ))}

          {/* Streaming message */}
          {streaming && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center bg-bg-tertiary border border-border">
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  <Bot className="w-4 h-4 text-primary-400" />
                </motion.div>
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed bg-bg-card border border-border text-text-primary whitespace-pre-wrap">
                {currentStream || (
                  <div className="flex gap-1 items-center py-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-primary-500"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.5, delay: i * 0.12, repeat: Infinity }}
                      />
                    ))}
                  </div>
                )}
                {currentStream && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.7, repeat: Infinity }}
                    className="inline-block w-0.5 h-4 bg-primary-400 ml-0.5 align-text-bottom"
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-safe pb-24 flex-shrink-0 border-t border-border bg-bg-secondary/50 backdrop-blur-xl pt-3">
        {/* Quick prompts when there are messages */}
        {messages.length > 0 && !streaming && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
            {QUICK_PROMPTS.map(p => (
              <button
                key={p.label}
                onClick={() => send(p.text)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-bg-card border border-border text-xs text-text-secondary hover:border-primary-700/40 hover:text-text-primary whitespace-nowrap transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
            placeholder="Ask your coach..."
            rows={1}
            className="flex-1 bg-bg-tertiary border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-700/50 resize-none max-h-32"
            style={{ fieldSizing: 'content' } as any}
          />
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => send(input)}
            disabled={!input.trim() || streaming}
            className="w-11 h-11 rounded-xl bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 shadow-glow-sm"
          >
            {streaming ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
