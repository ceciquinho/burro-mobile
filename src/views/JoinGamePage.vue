<template>
  <ion-page>
    <ion-header class="page-header"><ion-toolbar><ion-buttons slot="start"><ion-back-button default-href="/" text="" /></ion-buttons><ion-title>Entrar por Bluetooth</ion-title></ion-toolbar></ion-header>
    <ion-content class="page-content">
      <div class="page-shell bluetooth-shell">
        <div class="connection-mark"><ion-icon :icon="bluetoothOutline" /></div>
        <p class="eyebrow">MESA POR PERTO</p><h1 class="page-title">Entre na mesa.</h1>
        <p class="page-description">Ative o Bluetooth e procure um anfitrião próximo. Cada aparelho controla apenas a mão do seu jogador.</p>
        <div class="field-block"><ion-input v-model="playerName" class="bluetooth-name-input" label="Seu nome na mesa" label-placement="stacked" placeholder="Digite seu nome" :maxlength="24" /></div>
        <ion-button class="action-primary form-submit bluetooth-scan" expand="block" :disabled="phase === 'scanning' || phase === 'joining' || phase === 'waiting'" @click="scan">
          <ion-icon slot="start" :icon="bluetoothOutline" />{{ scanLabel }}
        </ion-button>
        <section v-if="rooms.length" class="bluetooth-results" aria-label="Mesas encontradas">
          <header class="bluetooth-section-heading"><div><h2>Mesas encontradas</h2><p>{{ rooms.length }} anfitrião{{ rooms.length === 1 ? '' : 's' }} por perto</p></div><ion-button fill="clear" class="action-text" @click="scan">Atualizar</ion-button></header>
          <ion-list class="bluetooth-room-list" lines="none">
            <ion-item v-for="room in rooms" :key="room.address" class="bluetooth-room-row">
              <span class="room-signal" slot="start"><ion-icon :icon="gameControllerOutline" /></span>
              <ion-label><strong>{{ room.name }}</strong><p>Mesa Burro · Bluetooth LE</p></ion-label>
              <ion-button slot="end" class="room-join-button" fill="clear" :disabled="phase !== 'idle' && phase !== 'scanning'" @click="join(room)">Entrar</ion-button>
            </ion-item>
          </ion-list>
        </section>
        <section v-if="phase === 'waiting'" class="bluetooth-lobby">
          <p class="eyebrow">SALA CONECTADA</p><h2>Aguardando o anfitrião</h2>
          <p>{{ lobby.length }} de {{ capacity }} jogadores na mesa</p>
          <ion-list class="bluetooth-room-list" lines="none"><ion-item v-for="player in lobby" :key="player.id" class="bluetooth-room-row"><span class="player-avatar-small" slot="start">{{ player.name.charAt(0).toLocaleUpperCase() }}</span><ion-label>{{ player.name }}</ion-label><span class="connection-status" slot="end">CONECTADO</span></ion-item></ion-list>
        </section>
        <p v-if="message" class="form-error" role="alert">{{ message }}</p>
        <div class="bluetooth-fallback"><span class="bluetooth-fallback__rule"></span><p>Sem outro Android por perto?</p><ion-button class="action-text" fill="clear" router-link="/create">Jogar neste aparelho</ion-button></div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onIonViewWillLeave } from '@ionic/vue'
import { computed, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import { bluetoothOutline, gameControllerOutline } from 'ionicons/icons'
import { attachBluetoothClient } from '../communication/gameSession'
import { BluetoothGameClient, scanBluetoothRooms, type BluetoothRoomSummary, type LobbyPlayer } from '../communication/BluetoothGameTransport'

const router = useRouter()
const playerName = ref('')
const rooms = ref<BluetoothRoomSummary[]>([])
const lobby = ref<LobbyPlayer[]>([])
const phase = ref<'idle' | 'scanning' | 'joining' | 'waiting' | 'playing'>('idle')
const message = ref('')
const capacity = ref(6)
const client = shallowRef<BluetoothGameClient>()
let stopScan: (() => void) | undefined
let scanTimeout = 0
let unsubscribeLobby: (() => void) | undefined
let unsubscribeStart: (() => void) | undefined
const scanLabel = computed(() => phase.value === 'scanning' ? 'Procurando mesas…' : phase.value === 'joining' ? 'Conectando…' : phase.value === 'waiting' ? 'Conectado' : 'Procurar mesas próximas')

async function scan(): Promise<void> {
  const normalizedName = playerName.value.trim()
  if (!normalizedName || normalizedName.length > 24) {
    message.value = 'Digite seu nome antes de procurar uma mesa.'
    return
  }
  message.value = ''
  rooms.value = []
  phase.value = 'scanning'
  try {
    stopScan?.()
    stopScan = await scanBluetoothRooms((room) => {
      if (!rooms.value.some((item) => item.address === room.address)) rooms.value.push(room)
    })
    window.clearTimeout(scanTimeout)
    scanTimeout = window.setTimeout(() => {
      stopScan?.()
      phase.value = 'idle'
    }, 12000)
  } catch (error) {
    phase.value = 'idle'
    message.value = error instanceof Error ? error.message : 'Não foi possível procurar mesas Bluetooth.'
  }
}

async function join(room: BluetoothRoomSummary): Promise<void> {
  phase.value = 'joining'
  message.value = ''
  stopScan?.()
  try {
    const connection = await BluetoothGameClient.connect(room.address, playerName.value.trim())
    client.value = connection
    capacity.value = connection.capacity
    lobby.value = connection.lobby
    attachBluetoothClient(connection)
    unsubscribeLobby = connection.subscribeLobby((players) => { lobby.value = players })
    unsubscribeStart = connection.onGameStart(() => {
      phase.value = 'playing'
      void router.push('/game')
    })
    phase.value = 'waiting'
  } catch (error) {
    phase.value = 'idle'
    message.value = error instanceof Error ? error.message : 'Não foi possível entrar nesta mesa.'
  }
}

onIonViewWillLeave(() => {
  window.clearTimeout(scanTimeout)
  stopScan?.()
  if (phase.value !== 'playing') {
    unsubscribeLobby?.()
    unsubscribeStart?.()
    void client.value?.disconnect()
  }
})
</script>