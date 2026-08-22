import { sql } from 'drizzle-orm'

import { db } from './src/db/index'
import { users } from './src/db/schema'
import { getDailyWordForUser, getExtraWordForUser } from './src/server/words'
import { studyValidateSentence } from './src/server/study'
import { getNextReviewQuestion, submitReviewAnswer } from './src/server/review'
import {
  getStatsView,
  getCefrBreakdown,
  getMemorizedTotal,
  getTotalWords,
} from './src/server/progress'
import { todayKey } from './src/server/gamification'

async function main() {
  const now = Date.now()
  const existing = db
    .select()
    .from(users)
    .where(sql`username_key = ${'testuser1'}`)
    .get()
  let userId: number
  if (existing) {
    userId = existing.id
  } else {
    const r = db
      .insert(users)
      .values({
        username: 'testuser1',
        usernameKey: 'testuser1',
        passwordHash: 'x',
        createdAt: now,
      })
      .returning({ id: users.id })
      .get()
    userId = r.id
  }
  console.log('userId:', userId)

  const today = todayKey()
  const daily = await getDailyWordForUser(userId, today)
  console.log('daily word:', daily?.word.word, 'status:', daily?.status)

  if (daily) {
    const res = await studyValidateSentence({
      userId,
      wordId: daily.word.id,
      sentence: `I like the ${daily.word.word} very much today.`,
      kind: 'daily',
    })
    console.log(
      'study result:',
      res.pass,
      'xp:',
      res.pass ? res.xpEarned : 0,
      'badges:',
      res.pass ? res.newlyBadges : [],
    )
  }

  const memCount = await getMemorizedTotal(userId)
  console.log('memorized total:', memCount)

  const q = await getNextReviewQuestion(userId, [])
  console.log('review question:', q?.word, '| options:', q?.options.length)
  if (q) {
    const wrong = await submitReviewAnswer({
      userId,
      wordId: q.wordId,
      chosenDefinition:
        q.options[0] === q.correctDefinition ? q.options[0] : q.options[1],
    })
    console.log(
      'review answer wrong -> correct?',
      wrong.correct,
      'xpEarned:',
      wrong.xpEarned,
    )
    const right = await submitReviewAnswer({
      userId,
      wordId: q.wordId,
      chosenDefinition: q.correctDefinition,
    })
    console.log(
      'review answer right -> correct?',
      right.correct,
      'xpEarned:',
      right.xpEarned,
    )
  }

  const extra = await getExtraWordForUser(userId, today)
  console.log('extra word:', extra?.word)

  const stats = await getStatsView(userId)
  console.log('stats:', JSON.stringify(stats))
  const cefr = await getCefrBreakdown(userId)
  console.log('cefr:', JSON.stringify(cefr))
  console.log('totalWords:', await getTotalWords())
}

main()
  .then(() => {
    db.$client.close()
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
