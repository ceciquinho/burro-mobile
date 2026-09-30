import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { HistoryRepository } from './historyRepository'

const repository = new HistoryRepository('burro-history-test')
const result = {
  id: 'record-1', date: '30/09/2026', time: '13:45', players: [{ id: 'p1', name: 'Ana', letters: [], letterCount: 0 }],
  winner: 'Ana', penalized: 'Bia', rounds: 4, reason: 'Fim de jogo',
}

afterEach(async () => {
  await repository.clear()
})

describe('HistoryRepository', () => {
  it('creates, retrieves, lists, deletes, and clears records in IndexedDB', async () => {
    await repository.save(result)
    expect((await repository.get(result.id))?.winner).toBe('Ana')
    expect(await repository.list()).toHaveLength(1)
    await repository.delete(result.id)
    expect(await repository.list()).toHaveLength(0)
    await repository.save(result)
    await repository.clear()
    expect(await repository.list()).toHaveLength(0)
  })
})