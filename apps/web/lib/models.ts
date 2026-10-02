import {anthropic} from '@ai-sdk/anthropic'
import {openai} from '@ai-sdk/openai'
import {google} from '@ai-sdk/google'
import type {LanguageModel} from 'ai'

export type ProviderName = 'openai' | 'anthropic' | 'google'

export function resolveProvider(): ProviderName {
  const pref = (process.env.LLM_PROVIDER || '').toLowerCase()
  if (pref === 'openai' || pref === 'anthropic' || pref === 'google') {
    if (pref === 'openai' && process.env.OPENAI_API_KEY) return 'openai'
    if (pref === 'anthropic' && process.env.ANTHROPIC_API_KEY) return 'anthropic'
    if (pref === 'google' && process.env.GEMINI_API_KEY) return 'google'
  }
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  if (process.env.GEMINI_API_KEY) return 'google'
  throw new Error(
    'No LLM API key configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY.',
  )
}

export function getModel(): LanguageModel {
  const provider = resolveProvider()
  if (provider === 'openai') {
    return openai(process.env.OPENAI_MODEL || 'gpt-4.1')
  }
  if (provider === 'anthropic') {
    return anthropic(process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6')
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GEMINI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY
  }
  return google(process.env.GOOGLE_MODEL || 'gemini-3.8-flash')
}
