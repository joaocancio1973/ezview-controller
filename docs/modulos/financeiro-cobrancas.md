# Financeiro e Cobrancas

## Objetivo

Abrir a fase 1 do dominio financeiro do `EzView` com foco em cobrancas operacionais, sem ainda entrar no ciclo completo de taxa condominial ou gateway externo.

## Escopo da fase 1

- cobrancas vinculadas a `Reservas`
- trilha financeira auditavel
- sincronizacao inicial com `Mensagens`
- base preparada para boleto, Pix e taxa condominial no futuro

## O que este modulo resolve agora

- transformar reserva com taxa em cobranca formal
- registrar status financeiro proprio, separado da reserva
- registrar eventos financeiros
- permitir leitura futura de comprovante, analise e confirmacao

## O que ainda nao e objetivo da fase 1

- emissao real de boleto
- Pix transacional integrado
- conciliacao bancaria
- taxa condominial mensal completa
- juros e multa automatizados

## Entidades da fase 1

### `financeiro_cobrancas`

Representa a cobranca principal.

Campos centrais:

- condominio
- unidade
- usuario responsavel
- origem
- forma de cobranca
- referencia
- valor
- status
- vencimento
- confirmacao
- observacoes
- vinculo opcional com `reserva`
- vinculo opcional com `lancamentos_financeiros` legado

### `financeiro_eventos`

Representa a trilha append-only da cobranca.

Campos centrais:

- cobranca
- condominio
- usuario responsavel pela acao
- mensagem relacionada, quando houver
- origem do ator
- tipo do evento
- status anterior
- status novo
- descricao

## Regras da fase 1

- reserva com taxa deve gerar ou sincronizar uma cobranca financeira
- o status financeiro nao deve ficar preso apenas em `reservas.status_pagamento`
- a cobranca deve permanecer auditavel mesmo quando a reserva for cancelada
- `lancamentos_financeiros` legado deve ser preservado, nao substituido abruptamente
- mensagens de pagamento devem apontar para a cobranca derivada da reserva

## Status recomendados da cobranca

- `rascunho`
- `pendente`
- `em_analise`
- `pago`
- `isento`
- `cancelado`
- `rejeitado`

## Formas de cobranca da fase 1

- `manual`
- `boleto_futuro`
- `pix_futuro`
- `isento`

## Integracao inicial com Reservas

Quando uma reserva com taxa e criada:

- a reserva nasce `pendente`
- o modulo financeiro cria a cobranca correspondente
- o inbox gera as mensagens de pagamento

Quando o morador sinaliza pagamento no inbox:

- a mensagem muda para `acionado`
- a cobranca muda para `em_analise`
- um evento financeiro e registrado

Quando o admin confirma:

- a reserva muda para `confirmada`
- `status_pagamento` vai para `pago`
- a cobranca vai para `pago`

Quando o admin rejeita:

- a reserva permanece `pendente`
- `status_pagamento` vai para `rejeitado`
- a cobranca vai para `rejeitado`

## Evolucao recomendada

### Fase 2

- `financeiro_anexos`
- comprovantes vinculados diretamente a cobrancas
- tela administrativa de cobrancas
- filtros por condominio, status, vencimento e origem

### Fase 3

- gateway externo
- boleto
- Pix
- webhook
- conciliacao
- taxa condominial
