import { describe, expect, it } from 'vitest'
import { base64ToBytes, BleMessageAssembler, bytesToBase64, encodeBleMessage } from './bleProtocol'

describe('BLE message protocol', () => {
  it('fragments and reassembles a message across default-size GATT packets', () => {
    const message = { type: 'state', player: 'Ana', cards: ['A-hearts', '10-spades', 'Q-clubs', '2-diamonds'], note: 'carta recebida' }
    const frames = encodeBleMessage(message)
    const assembler = new BleMessageAssembler()
    let result

    expect(frames.length).toBeGreaterThan(1)
    expect(frames.every((frame) => frame.length <= 20)).toBe(true)
    for (const frame of frames) result = assembler.accept('peer-1', frame) ?? result
    expect(result).toEqual(message)
  })

  it('reassembles out-of-order frames and keeps peer streams separate', () => {
    const firstFrames = encodeBleMessage({ type: 'lobby', players: ['Ana', 'Bia'], token: 'a'.repeat(40) })
    const secondFrames = encodeBleMessage({ type: 'join', name: 'Caio' })
    const assembler = new BleMessageAssembler()
    let firstResult
    for (const frame of [...firstFrames].reverse()) firstResult = assembler.accept('peer-1', frame) ?? firstResult
    let secondResult
    for (const frame of secondFrames) secondResult = assembler.accept('peer-2', frame) ?? secondResult
    expect(firstResult?.type).toBe('lobby')
    expect(secondResult).toEqual({ type: 'join', name: 'Caio' })
  })

  it('round-trips base64 data and ignores invalid frames', () => {
    const bytes = new Uint8Array([0, 4, 127, 255])
    const assembler = new BleMessageAssembler()
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes)
    expect(assembler.accept('peer-1', new Uint8Array([0, 1, 2, 3]))).toBeUndefined()
    expect(assembler.accept('peer-1', new Uint8Array([0xb7, 1, 1, 1, 2]))).toBeUndefined()
  })
})