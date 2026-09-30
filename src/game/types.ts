export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const
export const BURRO_LETTERS = ['B', 'U', 'R', 'R', 'O'] as const

export type Suit = (typeof SUITS)[number]
export type Rank = (typeof RANKS)[number]
export type PlayerId = string
export type GamePhase = 'exchange' | 'declaration' | 'finished'

export interface Card {
  id: string
  suit: Suit
  rank: Rank
}

export interface PlayerInput {
  id?: PlayerId
  name: string
}

export interface PlayerState {
  id: PlayerId
  name: string
  letters: string[]
  hand: Card[]
}

export interface GameSnapshot {
  id: string
  createdAt: string
  phase: GamePhase
  players: PlayerState[]
  rounds: number
  currentPlayerIndex: number
  selectedCards: Record<PlayerId, string>
  passedDeclarations: PlayerId[]
  winnerId?: PlayerId
  penalizedPlayerId?: PlayerId
  endReason?: string
}

export interface VisiblePlayer {
  id: PlayerId
  name: string
  letters: string[]
  letterCount: number
  isCurrent: boolean
  hasSelected: boolean
}

export interface PlayerGameView {
  id: string
  phase: GamePhase
  players: VisiblePlayer[]
  hand: Card[]
  viewerId: PlayerId
  currentPlayerId: PlayerId
  currentPlayerName: string
  rounds: number
  canDeclareFour: boolean
  hasSelected: boolean
  winnerId?: PlayerId
  penalizedPlayerId?: PlayerId
  endReason?: string
}

export interface GameResult {
  id: string
  date: string
  time: string
  players: Array<{ id: PlayerId; name: string; letters: string[]; letterCount: number }>
  winner: string
  penalized: string
  rounds: number
  reason: string
}

export interface GameEngineOptions {
  id?: string
  createdAt?: Date
  shuffle?: (cards: Card[]) => Card[]
}
