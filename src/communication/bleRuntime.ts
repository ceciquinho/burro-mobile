/// <reference types="cordova-plugin-bluetoothle" />

import { Capacitor } from '@capacitor/core'

export const BURRO_BLE_SERVICE = 'c8f5e50d-579d-4bd9-83b0-a611be230001'
export const BURRO_BLE_CHARACTERISTIC = 'c8f5e50d-579d-4bd9-83b0-a611be230002'
export const BURRO_BLE_DEVICE_PREFIX = 'BURRO'

let adapterReady: Promise<void> | undefined
let deviceReady: Promise<BluetoothlePlugin.Bluetoothle> | undefined

export async function getBluetoothLe(): Promise<BluetoothlePlugin.Bluetoothle> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    throw new Error('Bluetooth entre aparelhos está disponível na versão Android instalada. Use o modo local no navegador.')
  }
  if (window.bluetoothle) return window.bluetoothle
  deviceReady ??= new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('O serviço Bluetooth do Android não iniciou.')), 15000)
    document.addEventListener('deviceready', () => {
      window.clearTimeout(timeout)
      if (window.bluetoothle) resolve(window.bluetoothle)
      else reject(new Error('O plugin Bluetooth não foi carregado pelo Android.'))
    }, { once: true })
  })
  return deviceReady
}

export async function initializeBluetooth(plugin: BluetoothlePlugin.Bluetoothle, role: 'central' | 'peripheral'): Promise<void> {
  adapterReady ??= new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Ative o Bluetooth e tente novamente.')), 30000)
    plugin.initialize((result) => {
      if (result.status === 'enabled') {
        window.clearTimeout(timeout)
        resolve()
      }
    }, { request: true, statusReceiver: false })
  })
  await adapterReady

  if (role === 'peripheral') {
    await requirePermission(plugin, 'hasPermissionBtAdvertise', 'requestPermissionBtAdvertise')
    await requirePermission(plugin, 'hasPermissionBtConnect', 'requestPermissionBtConnect')
  } else {
    await requirePermission(plugin, 'hasPermissionBtScan', 'requestPermissionBtScan')
    await requirePermission(plugin, 'hasPermissionBtConnect', 'requestPermissionBtConnect')
  }
}

export function pluginCall<T>(operation: (success: (result: T) => void, error: (error: BluetoothlePlugin.Error) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    operation(resolve, (error) => reject(new Error(error.message || error.error || 'Falha na operação Bluetooth.')))
  })
}

async function requirePermission(
  plugin: BluetoothlePlugin.Bluetoothle,
  checkName: 'hasPermissionBtAdvertise' | 'hasPermissionBtConnect' | 'hasPermissionBtScan',
  requestName: 'requestPermissionBtAdvertise' | 'requestPermissionBtConnect' | 'requestPermissionBtScan',
): Promise<void> {
  const check = plugin[checkName].bind(plugin)
  const request = plugin[requestName].bind(plugin)
  const permission = await new Promise<{ hasPermission: boolean }>((resolve, reject) => {
    try { check(resolve) } catch (error) { reject(error) }
  })
  if (permission.hasPermission) return
  const requested = await new Promise<{ requestPermission: boolean }>((resolve, reject) => {
    try { request(resolve) } catch (error) { reject(error) }
  })
  if (!requested.requestPermission) throw new Error('A permissão Bluetooth foi recusada nas configurações do Android.')
}