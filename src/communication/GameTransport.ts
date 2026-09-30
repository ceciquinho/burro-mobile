import type { GameEngine } from '../game/GameEngine'
import type { PlayerGameView, PlayerId } from '../game/types'

export interface GameTransport {
  readonly role: 'local' | 'host' | 'client'
  getState(playerId: PlayerId): PlayerGameView
  selectCard(playerId: PlayerId, cardId: string): void | Promise<void>
  declareFourOfAKind(playerId: PlayerId): void | Promise<void>
  passDeclaration(playerId: PlayerId): void | Promise<void>
  subscribe(listener: () => void): () => void
}

export class LocalGameTransport implements GameTransport {
  readonly role = 'local' as const
  private readonly engine: GameEngine
  private readonly listeners = new Set<() => void>()

  constructor(engine: GameEngine) {
    this.engine = engine
  }

  getState(playerId: PlayerId): PlayerGameView {
    return this.engine.getState(playerId)
  }

  selectCard(playerId: PlayerId, cardId: string): void {
    this.engine.selectCard(playerId, cardId)
    this.notifyListeners()
  }

  declareFourOfAKind(playerId: PlayerId): void {
    this.engine.declareFourOfAKind(playerId)
    this.notifyListeners()
  }

  passDeclaration(playerId: PlayerId): void {
    this.engine.passDeclaration(playerId)
    this.notifyListeners()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener())
  }
}