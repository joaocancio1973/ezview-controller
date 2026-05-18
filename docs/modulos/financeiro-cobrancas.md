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

## Tela administrativa da fase 1

O primeiro front do modulo pertence apenas ao `admin`.

Ele entrega:

- menu `Financeiro`
- filtros por:
  - condominio
  - status
  - origem
  - vencimento
- busca textual por:
  - referencia
  - unidade
  - morador
  - condominio
- quantidade por pagina
- paginacao da grade administrativa
- tabela compacta de cobrancas
- detalhe da cobranca
- historico financeiro append-only
- relatorio de impressao e exportacao simples para PDF pelo navegador

## Governanca administrativa do responsavel financeiro

Com a base estrutural da fase 2 ja aplicada no banco, o `admin` passa a ter uma visao especifica para governar o `responsavel financeiro da unidade`.

Essa visao entrega:

- painel administrativo por condominio
- leitura da situacao por unidade:
  - `elegivel`
  - `pendente`
  - `nao_configurado`
- formulario tecnico e compacto para:
  - escolher o usuario vinculado a unidade
  - completar os dados minimos do pagador
  - definir:
    - `ativo_para_cobranca`
    - `recebe_cobranca`
    - `ambiente_financeiro`
    - `preferencia_envio`
- atualizacao controlada do vinculo `responsavel_financeiro_id` nas cobrancas locais

### Regras praticas dessa visao

- apenas `admin` governa o responsavel financeiro
- o usuario escolhido precisa estar ativo em `unidade_usuarios`
- a troca de responsavel nao apaga historico:
  - o registro anterior e encerrado
  - o novo registro assume a posicao ativa
- a interface nasce em linha tecnica:
  - fontes pequenas
  - tabela compacta
  - formulario objetivo
  - sem excesso de cards ou elementos visuais pesados

## Evolucao recomendada

### Fase 2

- `financeiro_gateway_contas`
- `financeiro_webhook_logs`
- `financeiro_notificacoes`
- `unidades_responsaveis_financeiros`
- ampliacao de `financeiro_cobrancas`
- ampliacao de `financeiro_eventos`
- vinculacao por `responsavel_financeiro_id`
- comprovantes vinculados diretamente a cobrancas, em fase posterior
- arquitetura oficial de boletos definida em:
  - `financeiro-boletos-arquitetura.md`
  - `financeiro-boletos-plano-implementacao.md`
  - `financeiro-boletos-checklist-execucao.md`
  - `financeiro-boletos-modelagem-fisica.md`
  - `financeiro-pagador-e-responsabilidade.md`

### Estado atual da fase 2

A base local do projeto ja recebeu a migracao estrutural da fase 2:

- tabela `financeiro_gateway_contas`
- tabela `unidades_responsaveis_financeiros`
- tabela `financeiro_webhook_logs`
- tabela `financeiro_notificacoes`
- novos campos de boleto em `financeiro_cobrancas`
- novos estados financeiros preparados:
  - `emitido`
  - `vencido`

Observacao importante:

- a migracao nasce em modo seguro
- o backfill cria responsavel financeiro com:
  - `ativo_para_cobranca = 0`
  - `recebe_cobranca = 0`
- isso prepara a base sem habilitar cobranca real por acidente

### Fase 3

- gateway externo
- boleto
- Pix
- webhook
- conciliacao
- taxa condominial
