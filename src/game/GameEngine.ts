import { BURRO_LETTERS, RANKS, SUITS, type Card, type GameEngineOptions, type GameResult, type GameSnapshot, type PlayerGameView, type PlayerId, type PlayerInput, type PlayerState } from './types'

function makeDeck(): Card[] {
  return RANKS.flatMap((rank) => SUITS.map((suit) => ({ id: `${rank}-${suit}`, rank, suit })))
}

function shuffleDeck(cards: Card[]): Card[] {
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]]
  }
  return cards
}

export class GameRuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GameRuleError'
  }
}

export class GameEngine {
  private state: GameSnapshot
  private shuffle: (cards: Card[]) => Card[]

  constructor(players: PlayerInput[], options: GameEngineOptions = {}) {
    if (players.length < 2 || players.length > 6) {
      throw new GameRuleError('A partida precisa ter de 2 a 6 jogadores.')
    }
    const names = players.map((player) => player.name.trim().toLocaleLowerCase())
    if (players.some((player) => !player.name.trim()) || new Set(names).size !== names.length) {
      throw new GameRuleError('Informe nomes válidos e diferentes para todos os jogadores.')
    }

    this.shuffle = options.shuffle ?? shuffleDeck
    const timestamp = options.createdAt ?? new Date()
    this.state = {
      id: options.id ?? crypto.randomUUID(),
      createdAt: timestamp.toISOString(),
      phase: 'exchange',
      players: players.map((player, index) => ({
        id: player.id ?? `player-${index + 1}`,
        name: player.name.trim(),
        letters: [],
        hand: [],
      })),
      rounds: 0,
      currentPlayerIndex: 0,
      selectedCards: {},
      passedDeclarations: [],
    }
    this.dealHands()
  }

  get gameId(): string {
    return this.state.id
  }

  get currentPlayerId(): PlayerId {
    return this.state.players[this.state.currentPlayerIndex].id
  }

  getPlayerIds(): PlayerId[] {
    return this.state.players.map((player) => player.id)
  }

  getPlayerHand(playerId: PlayerId): Card[] {
    return structuredClone(this.getPlayer(playerId).hand)
  }

  getState(playerId: PlayerId): PlayerGameView {
    const viewer = this.getPlayer(playerId)
    const current = this.state.players[this.state.currentPlayerIndex]
    return {
      id: this.state.id,
      phase: this.state.phase,
      players: this.state.players.map((player) => ({
        id: player.id,
        name: player.name,
        letters: [...player.letters],
        letterCount: player.letters.length,
        isCurrent: player.id === current.id,
        hasSelected: this.state.phase === 'exchange' && Boolean(this.state.selectedCards[player.id]),
      })),
      hand: this.state.phase === 'finished' ? [] : structuredClone(viewer.hand),
      viewerId: playerId,
      currentPlayerId: current.id,
      currentPlayerName: current.name,
      rounds: this.state.rounds,
      canDeclareFour: this.state.phase === 'declaration' && playerId === current.id && this.hasFourOfAKind(viewer),
      hasSelected: Boolean(this.state.selectedCards[playerId]),
      winnerId: this.state.winnerId,
      penalizedPlayerId: this.state.penalizedPlayerId,
      endReason: this.state.endReason,
    }
  }

  selectCard(playerId: PlayerId, cardId: string): void {
    this.assertPhase('exchange')
    const player = this.getPlayer(playerId)
    if (this.state.selectedCards[playerId]) throw new GameRuleError('Este jogador já escolheu uma carta nesta troca.')
    this.assertCurrentPlayer(playerId)
    if (!player.hand.some((card) => card.id === cardId)) throw new GameRuleError('A carta selecionada não pertence a este jogador.')
    this.state.selectedCards[playerId] = cardId

    if (Object.keys(this.state.selectedCards).length === this.state.players.length) {
      this.exchangeSelectedCards()
      this.state.rounds += 1
      this.state.phase = 'declaration'
      this.state.currentPlayerIndex = 0
      this.state.passedDeclarations = []
    } else {
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length
    }
  }

  declareFourOfAKind(playerId: PlayerId): void {
    this.assertPhase('declaration')
    this.assertCurrentPlayer(playerId)
    const declaringPlayer = this.getPlayer(playerId)
    if (!this.hasFourOfAKind(declaringPlayer)) throw new GameRuleError('Este jogador não possui quatro cartas iguais.')

    const penalized = this.state.players[(this.state.players.indexOf(declaringPlayer) + 1) % this.state.players.length]
    penalized.letters.push(BURRO_LETTERS[penalized.letters.length])
    this.state.passedDeclarations = []

    if (penalized.letters.length === BURRO_LETTERS.length) {
      this.state.phase = 'finished'
      this.state.winnerId = declaringPlayer.id
      this.state.penalizedPlayerId = penalized.id
      this.state.endReason = `${declaringPlayer.name} declarou quatro cartas iguais; ${penalized.name} completou BURRO.`
      return
    }

    this.dealHands()
    this.state.phase = 'exchange'
    this.state.currentPlayerIndex = 0
    this.state.selectedCards = {}
  }

  passDeclaration(playerId: PlayerId): void {
    this.assertPhase('declaration')
    this.assertCurrentPlayer(playerId)
    if (this.hasFourOfAKind(this.getPlayer(playerId))) {
      throw new GameRuleError('Quem possui quatro cartas iguais deve declarar antes de passar.')
    }
    this.state.passedDeclarations.push(playerId)
    if (this.state.passedDeclarations.length === this.state.players.length) {
      this.dealHands()
      this.state.phase = 'exchange'
      this.state.currentPlayerIndex = 0
      this.state.selectedCards = {}
      this.state.passedDeclarations = []
    } else {
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length
    }
  }

  getResult(endedAt = new Date()): GameResult {
    this.assertPhase('finished')
    const winner = this.getPlayer(this.state.winnerId!)
    const penalized = this.getPlayer(this.state.penalizedPlayerId!)
    return {
      id: this.state.id,
      date: endedAt.toLocaleDateString('pt-BR'),
      time: endedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      players: this.state.players.map(({ id, name, letters }) => ({ id, name, letters: [...letters], letterCount: letters.length })),
      winner: winner.name,
      penalized: penalized.name,
      rounds: this.state.rounds,
      reason: this.state.endReason ?? 'Partida encerrada.',
    }
  }

  private exchangeSelectedCards(): void {
    const outgoing = this.state.players.map((player) => {
      const selectedId = this.state.selectedCards[player.id]
      const cardIndex = player.hand.findIndex((card) => card.id === selectedId)
      if (cardIndex < 0) throw new GameRuleError('A troca contém uma carta inválida.')
      return player.hand.splice(cardIndex, 1)[0]
    })
    this.state.players.forEach((player, index) => {
      const previousIndex = (index - 1 + this.state.players.length) % this.state.players.length
      player.hand.push(outgoing[previousIndex])
    })
    this.state.selectedCards = {}
  }

  private dealHands(): void {
    const deck = this.shuffle(makeDeck())
    if (deck.length !== 52 || new Set(deck.map((card) => card.id)).size !== 52) {
      throw new GameRuleError('O baralho precisa conter 52 cartas únicas.')
    }
    this.state.players.forEach((player, index) => {
      player.hand = deck.slice(index * 4, index * 4 + 4).map((card) => ({ ...card }))
    })
  }

  private hasFourOfAKind(player: PlayerState): boolean {
    return player.hand.length === 4 && player.hand.every((card) => card.rank === player.hand[0].rank)
  }

  private getPlayer(playerId: PlayerId): PlayerState {
    const player = this.state.players.find((item) => item.id === playerId)
    if (!player) throw new GameRuleError('Jogador inválido.')
    return player
  }

  private assertPhase(phase: GameSnapshot['phase']): void {
    if (this.state.phase !== phase) throw new GameRuleError('Ação inválida nesta etapa da partida.')
  }

  private assertCurrentPlayer(playerId: PlayerId): void {
    this.getPlayer(playerId)
    if (this.currentPlayerId !== playerId) throw new GameRuleError('Ação fora do turno deste jogador.')
  }
}
