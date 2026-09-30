import { GameEngine } from '../game/GameEngine'
import type { GameResult, PlayerInput } from '../game/types'
import { LocalGameTransport, type GameTransport } from './GameTransport'
import type { BluetoothGameClient, BluetoothGameHost } from './BluetoothGameTransport'

let activeTransport: GameTransport | undefined
let activeEngine: GameEngine | undefined
let activeViewerId: string | undefined
let savedGameId: string | undefined
let activeBluetoothClient: BluetoothGameClient | undefined

export function startLocalGame(players: PlayerInput[]): string {
  activeEngine = new GameEngine(players)
  activeTransport = new LocalGameTransport(activeEngine)
  activeViewerId = activeEngine.getPlayerIds()[0]
  savedGameId = undefined
  activeBluetoothClient = undefined
  return activeViewerId
}

export function attachBluetoothHost(host: BluetoothGameHost): void {
  activeEngine = host.getEngine()
  activeTransport = host
  activeViewerId = host.hostPlayerId
  savedGameId = undefined
  activeBluetoothClient = undefined
}

export function attachBluetoothClient(client: BluetoothGameClient): void {
  activeEngine = undefined
  activeTransport = client
  activeViewerId = client.playerId
  savedGameId = undefined
  activeBluetoothClient = client
}

export function getActiveTransport(): GameTransport {
  if (!activeTransport) throw new Error('Nenhuma partida local está ativa.')
  return activeTransport
}

export function getActiveEngine(): GameEngine {
  if (!activeEngine) throw new Error('Nenhuma partida local está ativa.')
  return activeEngine
}

export function getActiveEngineOrUndefined(): GameEngine | undefined {
  return activeEngine
}

export function getActiveViewerId(): string {
  if (!activeViewerId) throw new Error('Nenhum jogador está selecionado.')
  return activeViewerId
}

export function setActiveViewerId(playerId: string): void {
  if (!activeEngine?.getPlayerIds().includes(playerId)) {
    throw new Error('Jogador inválido para esta partida.')
  }
  activeViewerId = playerId
}

export function hasSavedActiveGame(): boolean {
  const gameId = currentGameId()
  return Boolean(gameId && savedGameId === gameId)
}

export function markActiveGameSaved(): void {
  savedGameId = currentGameId()
}

export function getActiveGameResult(): GameResult | undefined {
  if (activeEngine) {
    try { return activeEngine.getResult() } catch { return undefined }
  }
  return activeBluetoothClient?.getResult()
}

function currentGameId(): string | undefined {
  if (activeEngine) return activeEngine.gameId
  if (!activeTransport || !activeViewerId) return undefined
  try { return activeTransport.getState(activeViewerId).id } catch { return undefined }
}