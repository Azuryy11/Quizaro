type ApiGet = (path: string) => Promise<Record<string, unknown>>

const warmPlayPayloadByQuizId = new Map<number, Record<string, unknown>>()
const inFlightWarmupsByQuizId = new Map<number, Promise<void>>()

export const warmPlayPayload = (quizId: number, payload: Record<string, unknown>): void => {
  if (!Number.isFinite(quizId) || quizId <= 0) {
    return
  }

  warmPlayPayloadByQuizId.set(quizId, payload)
}

export const consumeWarmedPlayPayload = (quizId: number): Record<string, unknown> | undefined => {
  const payload = warmPlayPayloadByQuizId.get(quizId)
  if (!payload) {
    return undefined
  }

  warmPlayPayloadByQuizId.delete(quizId)
  return payload
}

export const prewarmQuizSession = (apiGet: ApiGet, quizId: number): Promise<void> => {
  if (!Number.isFinite(quizId) || quizId <= 0) {
    return Promise.resolve()
  }

  if (warmPlayPayloadByQuizId.has(quizId)) {
    return Promise.resolve()
  }

  const existingRequest = inFlightWarmupsByQuizId.get(quizId)
  if (existingRequest) {
    return existingRequest
  }

  const request = apiGet(`/api/quizzes/${quizId}/play`)
    .then((result) => {
      warmPlayPayloadByQuizId.set(quizId, result)
    })
    .catch(() => {
      return
    })
    .finally(() => {
      inFlightWarmupsByQuizId.delete(quizId)
    })

  inFlightWarmupsByQuizId.set(quizId, request)
  return request
}