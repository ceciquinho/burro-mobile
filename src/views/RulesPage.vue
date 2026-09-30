<template>
  <ion-page>
    <ion-header class="page-header"><ion-toolbar><ion-buttons slot="start"><ion-back-button default-href="/" text="" /></ion-buttons><ion-title>Como jogar</ion-title></ion-toolbar></ion-header>
    <ion-content class="page-content rules-content">
      <section class="rules-hero">
        <p class="rules-kicker"><span class="live-dot"></span> GUIA DA MESA</p>
        <h1>Jogue com<br />atenção<span>.</span></h1>
        <p>Troque uma carta. Faça quatro iguais. Fuja das letras.</p>
        <span class="rules-hero-mark" aria-hidden="true">♠</span>
      </section>

      <main class="page-shell rules-shell">
        <section class="rules-facts" aria-label="Resumo das regras">
          <div><strong>2—6</strong><span>JOGADORES</span></div>
          <div><strong>52</strong><span>CARTAS</span></div>
          <div><strong>4</strong><span>CADA UM</span></div>
        </section>

        <section class="rules-section" aria-labelledby="round-title">
          <header class="rules-heading"><p class="eyebrow">A RODADA</p><h2 id="round-title">A mesa gira assim</h2></header>
          <ol class="rules-steps">
            <li><span class="rules-step-index">01</span><div><h3>Receba sua mão</h3><p>Use um baralho padrão. Cada pessoa recebe quatro cartas. A ordem dos lugares fica fixa durante a partida.</p></div></li>
            <li><span class="rules-step-index">02</span><div><h3>Escolha uma carta</h3><p>Na sua vez, reserve uma carta da mão. Não mostre nem entregue antes de todos escolherem.</p></div></li>
            <li><span class="rules-step-index">03</span><div><h3>Troquem juntos</h3><p>Quando todos tiverem escolhido, cada pessoa passa sua carta para a próxima na ordem circular e recebe a carta da pessoa anterior.</p></div></li>
            <li><span class="rules-step-index">04</span><div><h3>Confira quatro iguais</h3><p>Depois da troca, a vez de declarar percorre a mesa na mesma ordem. Quem tiver quatro cartas do mesmo valor declara. Se ninguém tiver, uma nova mão é distribuída do baralho completo.</p></div></li>
          </ol>
        </section>

        <section class="four-kind-section" aria-labelledby="four-kind-title">
          <div class="four-kind-copy"><p class="eyebrow">A JOGADA</p><h2 id="four-kind-title">Quatro do mesmo valor.</h2><p>Naipes diferentes valem. Ao declarar, a mão termina e a próxima pessoa recebe uma letra.</p></div>
          <div class="four-kind-cards" aria-label="Exemplo: quatro cartas de valor sete">
            <span class="mini-card">7<span>♣</span></span><span class="mini-card mini-card--red">7<span>♦</span></span><span class="mini-card mini-card--red">7<span>♥</span></span><span class="mini-card">7<span>♠</span></span>
          </div>
        </section>

        <section class="letters-section" aria-labelledby="letters-title">
          <div><p class="eyebrow">A PENALIDADE</p><h2 id="letters-title">Não complete a palavra.</h2><p>Quem recebe a quinta letra perde a partida. Quem declarou a última mão vence.</p></div>
          <div class="burro-track" aria-label="Letras da penalidade: B, U, R, R, O"><span>B</span><span>U</span><span>R</span><span>R</span><span>O</span></div>
        </section>

        <aside class="rules-note"><ion-icon :icon="phonePortraitOutline" /><p><strong>Joguem no mesmo aparelho?</strong> Passe-o para a próxima pessoa entre as jogadas. A mão fica oculta durante a passagem.</p></aside>
        <ion-button class="action-primary rules-start" expand="block" router-link="/create">Criar uma partida <ion-icon slot="end" :icon="arrowForwardOutline" /></ion-button>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import { arrowForwardOutline, phonePortraitOutline } from 'ionicons/icons'
</script>