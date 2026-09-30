<template>
  <ion-page>
    <ion-header class="page-header"><ion-toolbar><ion-buttons slot="start"><ion-back-button default-href="/create" text="" /></ion-buttons><ion-title>Hospedar por Bluetooth</ion-title></ion-toolbar></ion-header>
    <ion-content class="page-content">
      <div class="page-shell bluetooth-shell">
        <div class="connection-mark"><ion-icon :icon="bluetoothOutline" /></div>
        <p class="eyebrow">ANFITRIÃO DA MESA</p><h1 class="page-title">Abra sua mesa.</h1>
        <p class="page-description">Seu Android anuncia uma sala BLE. Até cinco aparelhos próximos podem entrar.</p>
        <template v-if="!room">
          <div class="field-block"><ion-input v-model="hostName" class="bluetooth-name-input" label="Seu nome na mesa" label-placement="stacked" placeholder="Digite seu nome" :maxlength="24" /></div>
          <div class="field-block"><label>Limite de jogadores</label><ion-segment v-model="capacity" class="player-count-segment" aria-label="Limite de jogadores"><ion-segment-button v-for="count in [2, 3, 4, 5, 6]" :key="count" :value="String(count)"><ion-label>{{ count }}</ion-label></ion-segment-button></ion-segment></div>
          <ion-button class="action-primary form-submit" expand="block" :disabled="phase === 'opening'" @click="openRoom"><ion-icon slot="start" :icon="bluetoothOutline" />{{ phase === 'opening' ? 'Ativando Bluetooth…' : 'Anunciar mesa' }}</ion-button>
        </template>
        <template v-else>
          <div class="room-open-banner"><span class="live-dot"></span><div><strong>Mesa visível por Bluetooth</strong><p>Deixe esta tela aberta enquanto os outros entram.</p></div></div>
          <section class="bluetooth-lobby"><header class="bluetooth-section-heading"><div><h2>Jogadores</h2><p>{{ players.length }} de {{ capacity }} lugares</p></div><span class="room-open-mark">ABERTA</span></header>
            <ion-list class="bluetooth-room-list" lines="none"><ion-item v-for="player in players" :key="player.id" class="bluetooth-room-row"><span class="player-avatar-small" slot="start">{{ player.name.charAt(0).toLocaleUpperCase() }}</span><ion-label>{{ player.name }}</ion-label><span class="connection-status" slot="end">{{ player.id === room.hostPlayerId ? 'ANFITRIÃO' : 'CONECTADO' }}</span></ion-item></ion-list>
          </section>
          <ion-button class="action-primary form-submit" expand="block" :disabled="players.length < 2" @click="startGame">Iniciar partida <ion-icon slot="end" :icon="arrowForwardOutline" /></ion-button>
          <ion-button class="action-text" fill="clear" expand="block" @click="cancelRoom">Encerrar sala</ion-button>
        </template>
        <p v-if="message" class="form-error" role="alert">{{ message }}</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onIonViewWillLeave } from '@ionic/vue'
import { ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonPage, IonSegment, IonSegmentButton, IonTitle, IonToolbar } from '@ionic/vue'
import { arrowForwardOutline, bluetoothOutline } from 'ionicons/icons'
import { BluetoothGameHost, type LobbyPlayer } from '../communication/BluetoothGameTransport'
import { attachBluetoothHost } from '../communication/gameSession'

const router = useRouter()
const hostName = ref('')
const capacity = ref('4')
const players = ref<LobbyPlayer[]>([])
const phase = ref<'idle' | 'opening' | 'lobby' | 'playing'>('idle')
const message = ref('')
const room = shallowRef<BluetoothGameHost>()
let unsubscribeLobby: (() => void) | undefined

async function openRoom(): Promise<void> {
  message.value = ''
  phase.value = 'opening'
  try {
    const host = new BluetoothGameHost(hostName.value, Number(capacity.value))
    room.value = host
    unsubscribeLobby = host.subscribeLobby((lobby) => { players.value = lobby })
    await host.open()
    phase.value = 'lobby'
  } catch (error) {
    phase.value = 'idle'
    message.value = error instanceof Error ? error.message : 'Não foi possível abrir a sala Bluetooth.'
    if (room.value) {
      unsubscribeLobby?.()
      await room.value.close()
      room.value = undefined
    }
  }
}

function startGame(): void {
  if (!room.value) return
  try {
    room.value.startGame()
    attachBluetoothHost(room.value)
    phase.value = 'playing'
    void router.push('/game')
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Não foi possível iniciar a partida.'
  }
}

async function cancelRoom(): Promise<void> {
  unsubscribeLobby?.()
  await room.value?.close()
  room.value = undefined
  phase.value = 'idle'
  players.value = []
}

onIonViewWillLeave(() => {
  if (phase.value !== 'playing') void cancelRoom()
})
</script>