import { openDB, type IDBPDatabase } from 'idb'
import type { GameResult } from '../game/types'

export interface HistoryRecord extends GameResult {
  savedAt: number
}

const STORE_NAME = 'games'

export class HistoryRepository {
  private database?: Promise<IDBPDatabase>
  private readonly databaseName: string

  constructor(databaseName = 'burro-history') {
    this.databaseName = databaseName
  }

  async list(): Promise<HistoryRecord[]> {
    return (await this.getDatabase()).getAll(STORE_NAME)
  }

  async get(id: string): Promise<HistoryRecord | undefined> {
    return (await this.getDatabase()).get(STORE_NAME, id)
  }

  async save(result: GameResult): Promise<void> {
    await (await this.getDatabase()).put(STORE_NAME, { ...result, savedAt: Date.now() })
  }

  async delete(id: string): Promise<void> {
    await (await this.getDatabase()).delete(STORE_NAME, id)
  }

  async clear(): Promise<void> {
    await (await this.getDatabase()).clear(STORE_NAME)
  }

  async close(): Promise<void> {
    if (this.database) (await this.database).close()
    this.database = undefined
  }

  private getDatabase(): Promise<IDBPDatabase> {
    this.database ??= openDB(this.databaseName, 1, {
      upgrade(database) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' })
      },
    })
    return this.database
  }
}

export const historyRepository = new HistoryRepository()