import {
  createGeminiValidator,
  createGeminiValidatorFromApi,
} from './gemini-validator.server'
import type { GeminiGenerateContent } from './gemini-validator.server'
import { keywordSentenceValidator } from './validate'
import type {
  SentenceValidationInput,
  SentenceValidator,
  ValidationResult,
} from './validate'

export interface SentenceValidatorConfig {
  mode?: string
  geminiApiKey?: string
  geminiModel?: string
  generateGeminiContent?: GeminiGenerateContent
}

export function createSentenceValidator(
  config: SentenceValidatorConfig,
): SentenceValidator {
  const mode = config.mode?.trim().toLowerCase()
  const apiKey = config.geminiApiKey?.trim()

  if (mode === 'keyword' || (mode && mode !== 'ai') || !apiKey) {
    return keywordSentenceValidator
  }

  const primary = config.generateGeminiContent
    ? createGeminiValidator(config.generateGeminiContent)
    : createGeminiValidatorFromApi(
        apiKey,
        config.geminiModel?.trim() || undefined,
      )

  return withKeywordFallback(primary)
}

export async function validateSentence(
  input: SentenceValidationInput,
): Promise<ValidationResult> {
  const validator = createSentenceValidator({
    mode: process.env.SENTENCE_VALIDATOR,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL,
  })
  return validator(input)
}

function withKeywordFallback(primary: SentenceValidator): SentenceValidator {
  return async (input) => {
    try {
      return await primary(input)
    } catch {
      return keywordSentenceValidator(input)
    }
  }
}
