const FRAME_MAGIC = 0xb7
const FRAME_HEADER_SIZE = 4
const DEFAULT_MTU = 23
let nextMessageId = 0

export interface BleMessage {
  type: string
  [key: string]: unknown
}

interface PendingMessage {
  partCount: number
  parts: Map<number, Uint8Array>
}

export function encodeBleMessage(message: BleMessage, mtu = DEFAULT_MTU): Uint8Array[] {
  const maxFrameLength = mtu - 3
  const payloadLength = maxFrameLength - FRAME_HEADER_SIZE
  if (payloadLength < 1) throw new Error('O MTU Bluetooth e pequeno demais para o protocolo.')

  const payload = new TextEncoder().encode(JSON.stringify(message))
  const partCount = Math.max(1, Math.ceil(payload.length / payloadLength))
  if (partCount > 255) throw new Error('A mensagem excede o limite de fragmentos Bluetooth.')

  const messageId = nextMessageId = (nextMessageId + 1) & 0xff
  return Array.from({ length: partCount }, (_, sequence) => {
    const start = sequence * payloadLength
    const chunk = payload.slice(start, start + payloadLength)
    const frame = new Uint8Array(FRAME_HEADER_SIZE + chunk.length)
    frame.set([FRAME_MAGIC, messageId, sequence, partCount])
    frame.set(chunk, FRAME_HEADER_SIZE)
    return frame
  })
}

export class BleMessageAssembler {
  private readonly pending = new Map<string, Map<number, PendingMessage>>()

  accept(peerId: string, frame: Uint8Array): BleMessage | undefined {
    if (frame.length < FRAME_HEADER_SIZE || frame[0] !== FRAME_MAGIC) return undefined
    const [, messageId, sequence, partCount] = frame
    if (partCount === 0 || sequence >= partCount) return undefined

    let peerMessages = this.pending.get(peerId)
    if (!peerMessages) {
      peerMessages = new Map()
      this.pending.set(peerId, peerMessages)
    }

    let pendingMessage = peerMessages.get(messageId)
    if (!pendingMessage) {
      pendingMessage = { partCount, parts: new Map() }
      peerMessages.set(messageId, pendingMessage)
    }
    if (pendingMessage.partCount !== partCount) {
      peerMessages.delete(messageId)
      return undefined
    }

    pendingMessage.parts.set(sequence, frame.slice(FRAME_HEADER_SIZE))
    if (pendingMessage.parts.size !== partCount) return undefined

    const totalLength = Array.from(pendingMessage.parts.values()).reduce((sum, part) => sum + part.length, 0)
    const payload = new Uint8Array(totalLength)
    let offset = 0
    for (let partIndex = 0; partIndex < partCount; partIndex += 1) {
      const part = pendingMessage.parts.get(partIndex)
      if (!part) return undefined
      payload.set(part, offset)
      offset += part.length
    }
    peerMessages.delete(messageId)

    try {
      const message: unknown = JSON.parse(new TextDecoder().decode(payload))
      return isBleMessage(message) ? message : undefined
    } catch {
      return undefined
    }
  }

  clearPeer(peerId: string): void {
    this.pending.delete(peerId)
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function isBleMessage(value: unknown): value is BleMessage {
  return typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string'
}