import { createServerFn } from '@tanstack/react-start'

import { authMiddleware } from './auth-middleware'
import { getNextReviewQuestion, submitReviewAnswer } from './review'

/** Fetches the next review question (FR-6). Returns null when the review is done. */
export const getReviewQuestionFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const { excludedWordIds } = input as { excludedWordIds?: unknown }
    if (
      !Array.isArray(excludedWordIds) ||
      excludedWordIds.some((n) => typeof n !== 'number')
    ) {
      throw new Error('Invalid input')
    }
    return { excludedWordIds }
  })
  .handler(async ({ context, data }) => {
    return getNextReviewQuestion(context.user.id, data.excludedWordIds)
  })

/** Records a review answer (FR-6.3/FR-6.5). */
export const answerReviewFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const { wordId, chosenDefinition } = input as {
      wordId?: unknown
      chosenDefinition?: unknown
    }
    if (typeof wordId !== 'number' || typeof chosenDefinition !== 'string') {
      throw new Error('Invalid input')
    }
    return { wordId, chosenDefinition }
  })
  .handler(async ({ context, data }) => {
    return submitReviewAnswer({
      userId: context.user.id,
      wordId: data.wordId,
      chosenDefinition: data.chosenDefinition,
    })
  })
