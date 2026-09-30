# Burro

Aplicativo mobile para jogar Burro localmente ou entre aparelhos Android por Bluetooth Low Energy (BLE), criado como um projeto independente.

## Objetivo

Jogar partidas de Burro em um unico dispositivo: cada pessoa recebe quatro cartas, escolhe uma para trocar em ordem circular e tenta formar quatro cartas do mesmo valor. Cada declaracao penaliza o proximo jogador com uma letra; quem completar BURRO perde a partida.

## Tecnologias

- Vue 3 com componentes `.vue` e `<script setup lang="ts">`
- Ionic Vue para interface mobile
- Vue Router / Ionic Router para navegacao
- TypeScript e Vite
- Capacitor 8, com plataforma Android
- `cordova-plugin-bluetoothle` para os papeis BLE anfitriao/periferico e jogador/central no Android
- IndexedDB via `idb` para historico local
- Vitest para regras e persistencia

## Estrutura

```text
src/
  communication/  transporte local, protocolo BLE e sessoes anfitriao/cliente
  components/     componentes Ionic reutilizaveis
  database/       repositorio IndexedDB e testes
  game/           motor independente, tipos e testes
  router/         rotas Ionic Vue
  views/          inicio, criacao, entrada, jogo e historico
  App.vue
  main.ts
capacitor.config.ts
```

O motor em `src/game/` nao importa Vue, Ionic, DOM, Capacitor ou Bluetooth. `GameTransport` separa a interface da comunicacao; o modo local e as salas BLE Android usam transportes independentes.

## Instalar e executar

Requer Node.js compativel com Vite 8 (Node 20.19+ ou 22.12+) e npm.

```bash
npm install
npm run dev
```

O Vite exibira o endereco local no terminal. O modo de entrada de partida cria uma mesa local para simular varias pessoas no mesmo aparelho; use o botao de passagem do aparelho entre as jogadas.

## Regras implementadas

- De 2 a 6 jogadores e baralho padrao de 52 cartas
- Quatro cartas por jogador, com ordem fixa na mesa
- Trocas reservadas por turno e aplicadas em bloco quando todos escolherem
- Recebimento da carta da pessoa anterior na ordem circular
- Se ninguem formar quatro iguais, uma nova mao de quatro cartas e distribuida do baralho completo de 52 cartas
- Validacao de jogadores, cartas, turnos, fase e selecoes repetidas
- Declaracao de quatro cartas iguais, penalidade sequencial B-U-R-R-O e encerramento
- `getState(playerId)` e `getPlayerHand(playerId)` restringem a visao de cartas a quem esta consultando; as maos adversarias nunca fazem parte da resposta de interface

As rodadas no historico correspondem ao numero de trocas completas realizadas.

## Testes

```bash
npm test
npm run test:watch
```

## Historico local

Partidas encerradas guardam ID, data, hora, jogadores e letras, vencedor, penalizado, quantidade de trocas e motivo do encerramento no IndexedDB do dispositivo. A tela de historico permite abrir detalhes, excluir um registro com confirmacao ou limpar tudo com confirmacao.

## Preparar Android

Instale Android Studio, Android SDK e JDK 17 ou superior, depois execute na pasta do projeto:

```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Depois de mudancas no app web, gere o build e sincronize novamente (`npm run build` e `npx cap sync android`). O projeto usa `capacitor.config.ts`, `appId` `com.burro.mobile` e saida web em `dist`.

## Partidas por Bluetooth

O jogo usa Bluetooth Low Energy (BLE) no Android. Um aparelho abre `Criar partida > Hospedar por Bluetooth`; os demais abrem `Entrar em partida`, informam seus nomes e procuram a sala. O anfitriao tambem joga. A mesa aceita de 2 a 6 aparelhos no total.

O anfitriao anuncia um servico GATT BLE e valida cada acao no `GameEngine`. O transporte envia a cada cliente apenas o estado filtrado daquele jogador; as maos dos adversarios nao sao transmitidas. Mensagens sao fragmentadas para caber no tamanho padrao dos pacotes BLE.

O plugin Cordova `cordova-plugin-bluetoothle` fornece os papeis central e periferico no Capacitor Android. O Android solicita permissao de dispositivos proximos e anuncio BLE quando necessario. Mantenha o app aberto durante a partida. Se um cliente perder a conexao, ele pode entrar novamente no mesmo anfitriao; a identidade do jogador e preservada nessa partida.

Bluetooth nao funciona no navegador nem no emulador Android. A validacao de radio e conexao precisa ser feita em pelo menos dois aparelhos Android fisicos com BLE. O modo local continua disponivel para desenvolvimento no navegador.

## Publicar no GitHub

O diretorio ja e um repositorio Git local na branch `main`. Para publicar em uma conta GitHub, crie um repositorio vazio chamado `burro-mobile`, configure o remoto e envie a branch:

```bash
git remote add origin https://github.com/SEU-USUARIO/burro-mobile.git
git add .
git commit -m "Initial Burro mobile app"
git push -u origin main
```

Escolha a visibilidade ao criar o repositorio. Nenhum remoto foi configurado automaticamente porque esta sessao nao tem GitHub CLI autenticado.

## Limitacoes e proximos passos

- A partida ao vivo e temporaria e nao e restaurada depois que o anfitriao fecha o app.
- O modo Bluetooth requer Android fisico; o navegador usa o modo local.
- O jogo de varios participantes no mesmo aparelho exige passagem fisica do dispositivo; no Bluetooth, cada pessoa joga no proprio aparelho.
- O historico persiste no IndexedDB do navegador/WebView e nao e sincronizado entre dispositivos.