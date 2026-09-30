/// <reference types="cordova-plugin-bluetoothle" />

import { GameEngine, GameRuleError } from '../game/GameEngine'
import type { GameResult, PlayerGameView, PlayerId, PlayerInput } from '../game/types'
import type { GameTransport } from './GameTransport'
import { base64ToBytes, BleMessageAssembler, bytesToBase64, encodeBleMessage, type BleMessage } from './bleProtocol'
import { BURRO_BLE_CHARACTERISTIC, BURRO_BLE_DEVICE_PREFIX, BURRO_BLE_SERVICE, getBluetoothLe, initializeBluetooth, pluginCall } from './bleRuntime'

export interface LobbyPlayer extends PlayerInput {
  id: PlayerId
  connected: boolean
}

export interface BluetoothRoomSummary {
  address: string
  name: string
}

interface RemoteClient {
  address: string
  playerId: PlayerId
  name: string
}

type PendingCommand = {
  resolve: () => void
  reject: (error: Error) => void
}

export class BluetoothGameHost implements GameTransport {
  readonly role = 'host' as const
  readonly hostPlayerId = 'host'
  private readonly hostName: string
  private readonly capacity: number
  private plugin?: BluetoothlePlugin.Bluetoothle
  private engine?: GameEngine
  private readonly assembler = new BleMessageAssembler()
  private readonly clientsByAddress = new Map<string, RemoteClient>()
  private readonly clientsById = new Map<PlayerId, RemoteClient>()
  private readonly connectedAddresses = new Set<string>()
  private readonly stateListeners = new Set<() => void>()
  private readonly lobbyListeners = new Set<(players: LobbyPlayer[]) => void>()
  private started = false

  constructor(hostName: string, capacity: number) {
    this.hostName = hostName.trim()
    this.capacity = capacity
    if (!this.hostName || this.hostName.length > 24) throw new GameRuleError('Informe um nome de anfitrião com até 24 caracteres.')
    if (!Number.isInteger(capacity) || capacity < 2 || capacity > 6) throw new GameRuleError('A mesa Bluetooth aceita de 2 a 6 jogadores.')
  }

  async open(): Promise<void> {
    this.plugin = await getBluetoothLe()
    await initializeBluetooth(this.plugin, 'peripheral')
    await pluginCall((success, error) => this.plugin!.initializePeripheral((event) => {
      this.handlePeripheralEvent(event)
      if (event.status === 'enabled') success(event)
    }, error, { request: true }))
    await pluginCall((success, error) => this.plugin!.removeAllServices(success, error))
    await pluginCall((success, error) => this.plugin!.addService(success, error, {
      service: BURRO_BLE_SERVICE,
      characteristics: [{
        uuid: BURRO_BLE_CHARACTERISTIC,
        properties: { read: true, write: true, writeWithoutResponse: true, notify: true },
        permissions: { read: true, write: true },
      }],
    }))
    await pluginCall((success, error) => this.plugin!.startAdvertising(success, error, {
      service: BURRO_BLE_SERVICE,
      includeDeviceName: true,
      includeTxPowerLevel: false,
      mode: 'lowLatency',
    }))
  }

  getLobby(): LobbyPlayer[] {
    return [
      { id: this.hostPlayerId, name: this.hostName, connected: true },
      ...Array.from(this.clientsById.values(), (client) => ({ id: client.playerId, name: client.name, connected: this.connectedAddresses.has(client.address) })),
    ]
  }

  subscribeLobby(listener: (players: LobbyPlayer[]) => void): () => void {
    this.lobbyListeners.add(listener)
    listener(this.getLobby())
    return () => this.lobbyListeners.delete(listener)
  }

  startGame(): void {
    if (this.started) throw new GameRuleError('A partida Bluetooth já começou.')
    const lobby = this.getLobby()
    if (lobby.length < 2) throw new GameRuleError('É preciso conectar pelo menos mais uma pessoa.')
    this.engine = new GameEngine(lobby.map(({ id, name }) => ({ id, name })))
    this.started = true
    void this.publishState('start')
    this.notifyStateListeners()
  }

  getState(playerId: PlayerId): PlayerGameView {
    if (!this.engine) throw new GameRuleError('A partida ainda não começou.')
    return this.engine.getState(playerId)
  }

  selectCard(playerId: PlayerId, cardId: string): void {
    this.getEngine().selectCard(playerId, cardId)
    void this.publishState('state')
    this.notifyStateListeners()
  }

  declareFourOfAKind(playerId: PlayerId): void {
    this.getEngine().declareFourOfAKind(playerId)
    void this.publishState('state')
    this.notifyStateListeners()
  }

  passDeclaration(playerId: PlayerId): void {
    this.getEngine().passDeclaration(playerId)
    void this.publishState('state')
    this.notifyStateListeners()
  }

  subscribe(listener: () => void): () => void {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  getEngine(): GameEngine {
    if (!this.engine) throw new GameRuleError('A partida Bluetooth ainda não começou.')
    return this.engine
  }

  async close(): Promise<void> {
    if (!this.plugin) return
    try { await pluginCall((success, error) => this.plugin!.stopAdvertising(success, error)) } catch { /* Already stopped. */ }
    try { await pluginCall((success, error) => this.plugin!.removeAllServices(success, error)) } catch { /* Service already removed. */ }
    this.connectedAddresses.clear()
    this.clientsByAddress.clear()
    this.clientsById.clear()
  }

  private handlePeripheralEvent(event: BluetoothlePlugin.InitializeResult): void {
    if (event.status === 'connected' && event.address) {
      this.connectedAddresses.add(event.address)
    } else if (event.status === 'disconnected' && event.address) {
      this.connectedAddresses.delete(event.address)
      this.assembler.clearPeer(event.address)
      const departed = this.clientsByAddress.get(event.address)
      if (departed && !this.started) {
        this.clientsByAddress.delete(event.address)
        this.clientsById.delete(departed.playerId)
        this.notifyLobbyListeners()
      }
    } else if (event.status === 'subscribed' && event.address) {
      const client = this.clientsByAddress.get(event.address)
      if (client && this.started) void this.resumePlayer(client)
      else if (client) void this.sendLobby(event.address)
    } else if (event.status === 'writeRequested' && event.address && event.value) {
      void this.handleWrite(event)
    }
  }

  private async handleWrite(event: BluetoothlePlugin.InitializeResult): Promise<void> {
    const plugin = this.plugin
    if (!plugin || !event.address || event.requestId === undefined) return
    try {
      await pluginCall((success, error) => plugin.respond(success, error, {
        requestId: event.requestId,
        address: event.address,
        value: event.value ?? '',
      }))
      const message = this.assembler.accept(event.address, base64ToBytes(event.value ?? ''))
      if (message) await this.handleMessage(event.address, message)
    } catch (error) {
      const client = this.clientsByAddress.get(event.address)
      if (client) await this.sendTo(event.address, { type: 'error', message: errorText(error) })
    }
  }

  private async handleMessage(address: string, message: BleMessage): Promise<void> {
    if (message.type === 'join') {
      await this.acceptPlayer(address, message)
      return
    }
    if (message.type !== 'action') return
    const client = this.clientsByAddress.get(address)
    const requestId = typeof message.requestId === 'string' ? message.requestId : ''
    if (!client || !this.engine || !requestId) return

    try {
      if (message.action === 'select' && typeof message.cardId === 'string') this.engine.selectCard(client.playerId, message.cardId)
      else if (message.action === 'declare') this.engine.declareFourOfAKind(client.playerId)
      else if (message.action === 'pass') this.engine.passDeclaration(client.playerId)
      else throw new GameRuleError('Comando de jogo desconhecido.')
      await this.sendTo(address, { type: 'ack', requestId })
      await this.publishState('state')
      this.notifyStateListeners()
    } catch (error) {
      await this.sendTo(address, { type: 'ack', requestId, error: errorText(error) })
    }
  }

  private async acceptPlayer(address: string, message: BleMessage): Promise<void> {
    const name = typeof message.name === 'string' ? message.name.trim() : ''
    const existing = this.clientsByAddress.get(address)
    if (this.started) {
      if (existing && name.toLocaleLowerCase() === existing.name.toLocaleLowerCase()) await this.resumePlayer(existing)
      else await this.sendTo(address, { type: 'error', message: 'A partida já começou.' })
      return
    }
    const names = this.getLobby().map((player) => player.name.toLocaleLowerCase())
    if (!name || name.length > 24 || (!existing && names.includes(name.toLocaleLowerCase()))) {
      await this.sendTo(address, { type: 'error', message: 'Escolha um nome válido e diferente dos demais.' })
      return
    }
    if (!existing && this.getLobby().length >= this.capacity) {
      await this.sendTo(address, { type: 'error', message: 'Esta mesa já está completa.' })
      return
    }

    const client = existing ?? { address, playerId: `player-${crypto.randomUUID()}`, name }
    client.name = name
    this.clientsByAddress.set(address, client)
    this.clientsById.set(client.playerId, client)
    await this.sendJoined(address, client)
    this.notifyLobbyListeners()
    await this.publishLobby()
  }

  private async sendJoined(address: string, client: RemoteClient): Promise<void> {
    await this.sendTo(address, { type: 'joined', playerId: client.playerId, hostName: this.hostName, players: this.getLobby(), capacity: this.capacity })
  }

  private async resumePlayer(client: RemoteClient): Promise<void> {
    await this.sendJoined(client.address, client)
    if (this.engine) {
      const result = this.engine.getState(client.playerId).phase === 'finished' ? this.engine.getResult() : undefined
      await this.sendTo(client.address, { type: 'start', state: this.engine.getState(client.playerId), result })
    } else {
      await this.sendLobby(client.address)
    }
  }

  private async sendLobby(address: string): Promise<void> {
    if (!this.clientsByAddress.has(address)) return
    await this.sendTo(address, { type: 'lobby', players: this.getLobby(), capacity: this.capacity })
  }

  private async publishLobby(): Promise<void> {
    await Promise.all(Array.from(this.clientsByAddress.keys(), (address) => this.sendLobby(address)))
  }

  private async publishState(type: 'start' | 'state'): Promise<void> {
    if (!this.engine) return
    const result: GameResult | undefined = this.engine.getState(this.hostPlayerId).phase === 'finished' ? this.engine.getResult() : undefined
    await Promise.all(Array.from(this.clientsById.values(), async (client) => {
      await this.sendTo(client.address, {
        type,
        state: this.engine!.getState(client.playerId),
        result,
      })
    }))
  }

  private async sendTo(address: string, message: BleMessage): Promise<void> {
    if (!this.plugin || !this.connectedAddresses.has(address)) return
    const frames = encodeBleMessage(message)
    for (const frame of frames) {
      await pluginCall((success, error) => this.plugin!.notify(success, error, {
        service: BURRO_BLE_SERVICE,
        characteristic: BURRO_BLE_CHARACTERISTIC,
        address,
        value: bytesToBase64(frame),
      }))
    }
  }

  private notifyLobbyListeners(): void {
    const lobby = this.getLobby()
    this.lobbyListeners.forEach((listener) => listener(lobby))
  }

  private notifyStateListeners(): void {
    this.stateListeners.forEach((listener) => listener())
  }
}

export class BluetoothGameClient implements GameTransport {
  readonly role = 'client' as const
  readonly address: string
  readonly playerName: string
  playerId = ''
  hostName = ''
  capacity = 6
  lobby: LobbyPlayer[] = []
  private plugin?: BluetoothlePlugin.Bluetoothle
  private state?: PlayerGameView
  private result?: GameResult
  private readonly assembler = new BleMessageAssembler()
  private readonly stateListeners = new Set<() => void>()
  private readonly lobbyListeners = new Set<(players: LobbyPlayer[]) => void>()
  private readonly pendingCommands = new Map<string, PendingCommand>()
  private joinResolve?: () => void
  private joinReject?: (error: Error) => void
  private gameStartListeners = new Set<() => void>()
  private sequence = 0

  private constructor(address: string, playerName: string) {
    this.address = address
    this.playerName = playerName.trim()
  }

  static async connect(address: string, playerName: string): Promise<BluetoothGameClient> {
    const client = new BluetoothGameClient(address, playerName)
    await client.connectAndJoin()
    return client
  }

  getState(playerId: PlayerId): PlayerGameView {
    if (playerId !== this.playerId) throw new GameRuleError('Este aparelho só pode consultar a mão do jogador conectado.')
    if (!this.state) throw new GameRuleError('Aguardando o anfitrião iniciar a partida.')
    return structuredClone(this.state)
  }

  selectCard(playerId: PlayerId, cardId: string): Promise<void> {
    return this.sendAction(playerId, 'select', cardId)
  }

  declareFourOfAKind(playerId: PlayerId): Promise<void> {
    return this.sendAction(playerId, 'declare')
  }

  passDeclaration(playerId: PlayerId): Promise<void> {
    return this.sendAction(playerId, 'pass')
  }

  subscribe(listener: () => void): () => void {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  subscribeLobby(listener: (players: LobbyPlayer[]) => void): () => void {
    this.lobbyListeners.add(listener)
    if (this.lobby.length) listener(this.lobby)
    return () => this.lobbyListeners.delete(listener)
  }

  onGameStart(listener: () => void): () => void {
    this.gameStartListeners.add(listener)
    if (this.state) listener()
    return () => this.gameStartListeners.delete(listener)
  }

  getResult(): GameResult | undefined {
    return this.result ? structuredClone(this.result) : undefined
  }

  async disconnect(): Promise<void> {
    if (!this.plugin) return
    try {
      await pluginCall((success, error) => this.plugin!.unsubscribe(success, error, {
        address: this.address, service: BURRO_BLE_SERVICE, characteristic: BURRO_BLE_CHARACTERISTIC,
      }))
    } catch { /* Subscription may already be closed. */ }
    try { await pluginCall((success, error) => this.plugin!.close(success, error, { address: this.address })) } catch { /* Connection may already be closed. */ }
  }

  private async connectAndJoin(): Promise<void> {
    if (!this.playerName || this.playerName.length > 24) throw new GameRuleError('Informe um nome com até 24 caracteres.')
    this.plugin = await getBluetoothLe()
    await initializeBluetooth(this.plugin, 'central')
    await this.connectPeripheral()
    await pluginCall((success, error) => this.plugin!.discover(success, error, { address: this.address }))

    const joined = new Promise<void>((resolve, reject) => {
      this.joinResolve = resolve
      this.joinReject = reject
      window.setTimeout(() => reject(new Error('O anfitrião não respondeu. Tente entrar novamente.')), 20000)
    })
    await pluginCall((success, error) => this.plugin!.subscribe((result) => {
      if (result.status === 'subscribed') success(result)
      else if (result.status === 'subscribedResult') this.handleNotification(result.value)
    }, error, {
      address: this.address, service: BURRO_BLE_SERVICE, characteristic: BURRO_BLE_CHARACTERISTIC,
    }))
    await this.send({ type: 'join', name: this.playerName })
    await joined
  }

  private async connectPeripheral(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      let connected = false
      this.plugin!.connect((result) => {
        if (result.status === 'connected' && !connected) {
          connected = true
          resolve()
        } else if (result.status === 'disconnected') {
          const error = new Error('A conexão Bluetooth com o anfitrião foi perdida.')
          this.joinReject?.(error)
          this.pendingCommands.forEach((pending) => pending.reject(error))
          this.pendingCommands.clear()
        }
      }, reject, { address: this.address, transport: BluetoothlePlugin.AndroidGattTransportMode.TRANSPORT_LE })
    })
  }

  private handleNotification(value: string): void {
    try {
      const message = this.assembler.accept(this.address, base64ToBytes(value))
      if (!message) return
      if (message.type === 'joined') {
        this.playerId = String(message.playerId)
        this.hostName = String(message.hostName)
        if (typeof message.capacity === 'number') this.capacity = message.capacity
        this.updateLobby(message.players)
        this.joinResolve?.()
        return
      }
      if (message.type === 'lobby') {
        this.updateLobby(message.players)
        return
      }
      if (message.type === 'ack' && typeof message.requestId === 'string') {
        const pending = this.pendingCommands.get(message.requestId)
        if (pending) {
          this.pendingCommands.delete(message.requestId)
          if (typeof message.error === 'string') pending.reject(new Error(message.error))
          else pending.resolve()
        }
        return
      }
      if ((message.type === 'state' || message.type === 'start') && isPlayerGameView(message.state)) {
        this.state = message.state
        if (isGameResult(message.result)) this.result = message.result
        if (message.type === 'start') this.gameStartListeners.forEach((listener) => listener())
        this.stateListeners.forEach((listener) => listener())
      }
      if (message.type === 'error' && typeof message.message === 'string') this.joinReject?.(new Error(message.message))
    } catch (error) {
      this.joinReject?.(error instanceof Error ? error : new Error('Mensagem Bluetooth inválida.'))
    }
  }

  private updateLobby(value: unknown): void {
    if (!Array.isArray(value)) return
    this.lobby = value.filter(isLobbyPlayer)
    this.lobbyListeners.forEach((listener) => listener(this.lobby))
  }

  private async sendAction(playerId: PlayerId, action: 'select' | 'declare' | 'pass', cardId?: string): Promise<void> {
    if (playerId !== this.playerId) throw new GameRuleError('Este aparelho só pode jogar pela pessoa conectada.')
    const requestId = `${this.address}-${++this.sequence}`
    const acknowledgement = new Promise<void>((resolve, reject) => this.pendingCommands.set(requestId, { resolve, reject }))
    await this.send({ type: 'action', requestId, action, cardId })
    await acknowledgement
  }

  private async send(message: BleMessage): Promise<void> {
    if (!this.plugin) throw new Error('Bluetooth não conectado.')
    for (const frame of encodeBleMessage(message)) {
      await pluginCall((success, error) => this.plugin!.write(success, error, {
        address: this.address,
        service: BURRO_BLE_SERVICE,
        characteristic: BURRO_BLE_CHARACTERISTIC,
        value: bytesToBase64(frame),
      }))
    }
  }
}

export async function scanBluetoothRooms(onFound: (room: BluetoothRoomSummary) => void): Promise<() => void> {
  const plugin = await getBluetoothLe()
  await initializeBluetooth(plugin, 'central')
  await pluginCall((success, error) => plugin.startScan((result) => {
    if (result.status === 'scanStarted') {
      success(result)
      return
    }
    if (result.status !== 'scanResult' || !result.address) return
    if (typeof result.advertisement === 'object' && result.advertisement !== null) {
      const advertisesGameService = result.advertisement.serviceUuids.some((service) => service.toLocaleLowerCase() === BURRO_BLE_SERVICE.toLocaleLowerCase())
      if (!advertisesGameService) return
    }
    onFound({ address: result.address, name: result.name || BURRO_BLE_DEVICE_PREFIX })
    success(result)
  }, error, { services: [BURRO_BLE_SERVICE], scanMode: BluetoothlePlugin.BluetoothScanMode.SCAN_MODE_LOW_LATENCY }))
  return () => { plugin.stopScan(() => undefined, () => undefined) }
}

function isLobbyPlayer(value: unknown): value is LobbyPlayer {
  if (typeof value !== 'object' || value === null) return false
  const player = value as Partial<LobbyPlayer>
  return typeof player.id === 'string' && typeof player.name === 'string' && typeof player.connected === 'boolean'
}

function isPlayerGameView(value: unknown): value is PlayerGameView {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Partial<PlayerGameView>
  return typeof state.phase === 'string' && Array.isArray(state.players) && Array.isArray(state.hand) && typeof state.viewerId === 'string'
}

function isGameResult(value: unknown): value is GameResult {
  if (typeof value !== 'object' || value === null) return false
  const result = value as Partial<GameResult>
  return typeof result.id === 'string' && typeof result.winner === 'string' && typeof result.penalized === 'string'
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Falha na operação Bluetooth.'
}