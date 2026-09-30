import { describe, expect, it } from 'vitest'
import { GameEngine, GameRuleError } from './GameEngine'
import type { Card } from './types'

const players = [{ id: 'ana', name: 'Ana' }, { id: 'bia', name: 'Bia' }]

function fourAfterExchangeDeck(cards: Card[]): Card[] {
  const ordered = [...cards].sort((left, right) => {
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    const suits = ['clubs', 'diamonds', 'hearts', 'spades']
    return ranks.indexOf(left.rank) - ranks.indexOf(right.rank) || suits.indexOf(left.suit) - suits.indexOf(right.suit)
  })
  const byId = new Map(ordered.map((card) => [card.id, card]))
  const topCards = ['A-clubs', 'A-diamonds', 'A-hearts', '2-clubs', 'A-spades', '2-diamonds', '2-hearts', '2-spades']
  const selected = new Set(topCards)
  return [...topCards.map((id) => byId.get(id)!), ...ordered.filter((card) => !selected.has(card.id))]
}

function makeEngine(): GameEngine {
  return new GameEngine(players, { id: 'game-1', shuffle: fourAfterExchangeDeck })
}

function finishExchange(game: GameEngine): void {
  game.selectCard('ana', game.getPlayerHand('ana').find((card) => card.id === '2-clubs')!.id)
  game.selectCard('bia', game.getPlayerHand('bia')[0].id)
}

describe('GameEngine', () => {
  it('distributes four unique cards per player and only reveals the viewer hand', () => {
    const game = makeEngine()
    const ana = game.getState('ana')
    expect(ana.hand).toHaveLength(4)
    expect(game.getPlayerHand('bia')).toHaveLength(4)
    expect(ana.hand.map((card) => card.id)).not.toEqual(game.getPlayerHand('bia').map((card) => card.id))
    expect(ana.players[0]).not.toHaveProperty('hand')
  })

  it('rejects invalid players, cards, duplicate selections, and out-of-turn actions', () => {
    const game = makeEngine()
    expect(() => game.selectCard('intruso', 'A-clubs')).toThrow(GameRuleError)
    expect(() => game.selectCard('bia', 'A-clubs')).toThrow(/fora do turno/)
    expect(() => game.selectCard('ana', 'not-in-hand')).toThrow(/não pertence/)
    game.selectCard('ana', game.getPlayerHand('ana')[0].id)
    expect(() => game.selectCard('ana', game.getPlayerHand('ana')[1].id)).toThrow(/já escolheu/)
  })

  it('waits for every player and exchanges all cards in one circular operation', () => {
    const game = makeEngine()
    const anaCard = game.getPlayerHand('ana')[0]
    const biaCard = game.getPlayerHand('bia')[0]
    game.selectCard('ana', anaCard.id)
    expect(game.getState('ana').phase).toBe('exchange')
    game.selectCard('bia', biaCard.id)
    expect(game.getState('ana').phase).toBe('declaration')
    expect(game.getPlayerHand('ana').some((card) => card.id === biaCard.id)).toBe(true)
    expect(game.getPlayerHand('bia').some((card) => card.id === anaCard.id)).toBe(true)
    expect(new Set([...game.getPlayerHand('ana'), ...game.getPlayerHand('bia')].map((card) => card.id)).size).toBe(8)
  })

  it('requires a four-of-a-kind declaration and awards the next letter to the next player', () => {
    const game = makeEngine()
    finishExchange(game)
    expect(game.getState('ana').canDeclareFour).toBe(true)
    game.declareFourOfAKind('ana')
    expect(game.getState('bia').players[1].letters).toEqual(['B'])
    expect(game.getState('ana').phase).toBe('exchange')
    expect(() => game.declareFourOfAKind('ana')).toThrow(/etapa/)
  })

  it('rejects passing when the current player has four equal cards', () => {
    const game = makeEngine()
    finishExchange(game)
    expect(() => game.passDeclaration('ana')).toThrow(/deve declarar/)
  })

  it('deals a fresh four-card hand from a full 52-card deck if nobody declares', () => {
    const deckSizes: number[] = []
    let dealCount = 0
    const game = new GameEngine(players, {
      shuffle: (cards) => {
        deckSizes.push(cards.length)
        const offset = dealCount++ === 0 ? 0 : 8
        return [...cards.slice(offset), ...cards.slice(0, offset)]
      },
    })
    const firstHand = game.getPlayerHand('ana')
    game.selectCard('ana', firstHand[0].id)
    game.selectCard('bia', game.getPlayerHand('bia')[0].id)
    expect(game.getState('ana').canDeclareFour).toBe(false)
    game.passDeclaration('ana')
    game.passDeclaration('bia')

    const newHands = [...game.getPlayerHand('ana'), ...game.getPlayerHand('bia')]
    expect(game.getState('ana').phase).toBe('exchange')
    expect(game.currentPlayerId).toBe('ana')
    expect(game.getPlayerHand('ana')).toHaveLength(4)
    expect(newHands).toHaveLength(8)
    expect(new Set(newHands.map((card) => card.id)).size).toBe(8)
    expect(game.getPlayerHand('ana').map((card) => card.id)).not.toEqual(firstHand.map((card) => card.id))
    expect(deckSizes).toEqual([52, 52])
  })

  it('ends when the next player receives O and records the result', () => {
    const game = makeEngine()
    for (const letter of ['B', 'U', 'R', 'R', 'O']) {
      finishExchange(game)
      game.declareFourOfAKind('ana')
      expect(game.getState('bia').players[1].letters.at(-1)).toBe(letter)
    }
    expect(game.getState('ana').phase).toBe('finished')
    expect(game.getResult(new Date('2026-09-30T13:45:00')).penalized).toBe('Bia')
    expect(game.getResult().players[1].letters).toEqual(['B', 'U', 'R', 'R', 'O'])
  })

  it('rejects duplicate names and player counts outside the rules', () => {
    expect(() => new GameEngine([{ name: 'Ana' }])).toThrow(/2 a 6/)
    expect(() => new GameEngine([{ name: 'Ana' }, { name: ' ana ' }])).toThrow(/diferentes/)
  })
})