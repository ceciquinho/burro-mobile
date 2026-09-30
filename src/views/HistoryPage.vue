<template>
  <ion-page>
    <ion-header class="page-header"><ion-toolbar><ion-buttons slot="start"><ion-back-button default-href="/" text="" /></ion-buttons><ion-title>Histórico</ion-title><ion-button v-if="records.length" slot="end" fill="clear" class="toolbar-action" aria-label="Limpar histórico" @click="clearAlertOpen = true"><ion-icon :icon="trashOutline" /></ion-button></ion-toolbar></ion-header>
    <ion-content class="page-content">
      <div class="page-shell history-shell">
        <p class="eyebrow">ARQUIVO DA MESA</p><h1 class="page-title">Partidas jogadas<span class="hero-period">.</span></h1>
        <p class="history-count">{{ records.length }} {{ records.length === 1 ? 'registro' : 'registros' }}</p>
        <div v-if="!records.length" class="empty-state"><span class="empty-mark">52</span><h2>Nenhuma partida ainda.</h2><p>Os resultados aparecem aqui depois que uma partida termina.</p><ion-button class="action-primary" router-link="/create">Criar partida</ion-button></div>
        <ion-list v-else class="history-list" lines="none">
          <ion-item v-for="record in records" :key="record.id" class="history-row" :button="true" :detail="false" @click="openDetails(record.id)">
            <div class="history-date" slot="start"><b>{{ record.date }}</b><span>{{ record.time }}</span></div>
            <div class="history-main"><strong>{{ record.winner }} venceu</strong><span>{{ record.players.length }} jogadores · {{ record.rounds }} trocas · {{ record.penalized }} penalizado</span></div>
            <ion-button slot="end" fill="clear" class="row-delete" aria-label="Excluir partida" @click.stop="pendingDeleteId = record.id"><ion-icon :icon="trashOutline" /></ion-button>
            <ion-icon slot="end" class="row-chevron" :icon="chevronForwardOutline" />
          </ion-item>
        </ion-list>
      </div>
      <ion-alert :is-open="pendingDeleteId !== null" header="Excluir partida?" message="Este registro será removido do histórico." :buttons="deleteButtons" @did-dismiss="pendingDeleteId = null" />
      <ion-alert :is-open="clearAlertOpen" header="Limpar histórico?" message="Todas as partidas salvas serão removidas." :buttons="clearButtons" @did-dismiss="clearAlertOpen = false" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onIonViewWillEnter } from '@ionic/vue'
import { IonAlert, IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonList, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { chevronForwardOutline, trashOutline } from 'ionicons/icons'
import { historyRepository, type HistoryRecord } from '../database/historyRepository'

const router = useRouter()
const records = ref<HistoryRecord[]>([])
const pendingDeleteId = ref<string | null>(null)
const clearAlertOpen = ref(false)
const deleteButtons = [
  { text: 'Cancelar', role: 'cancel' },
  { text: 'Excluir', role: 'destructive', handler: () => deleteRecord() },
]
const clearButtons = [
  { text: 'Cancelar', role: 'cancel' },
  { text: 'Limpar tudo', role: 'destructive', handler: () => clearHistory() },
]

onIonViewWillEnter(() => { void loadHistory() })

async function loadHistory(): Promise<void> {
  records.value = (await historyRepository.list()).sort((left, right) => right.savedAt - left.savedAt)
}

async function deleteRecord(): Promise<void> {
  if (!pendingDeleteId.value) return
  await historyRepository.delete(pendingDeleteId.value)
  pendingDeleteId.value = null
  await loadHistory()
}

async function clearHistory(): Promise<void> {
  await historyRepository.clear()
  await loadHistory()
}

function openDetails(id: string): void {
  void router.push(`/history/${encodeURIComponent(id)}`)
}
</script>