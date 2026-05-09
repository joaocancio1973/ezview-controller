# Plano de Implementacao - Financeiro com Boletos

## Objetivo

Transformar a arquitetura oficial de boletos do `EzView` em um plano de execucao por etapas, sem ainda iniciar a integracao real.

Este plano existe para responder:

- o que vem primeiro
- o que depende de que
- o que precisa estar pronto antes de producao
- como homologar com seguranca

## Principio de execucao

O modulo financeiro com boletos nao deve ser implementado como bloco unico.

Ele deve avancar por fases:

- pequenas
- auditaveis
- testaveis
- com rollback conceitual claro

## Resultado esperado ao fim do plano

Ao final da trilha de implementacao, o `EzView` deve ser capaz de:

- cadastrar a conta financeira oficial do condominio
- validar se o pagador possui dados minimos consistentes
- emitir boleto oficial por API
- registrar linha digitavel e PDF
- enviar o boleto automaticamente por canais do `EzView`
- receber webhook com idempotencia
- atualizar status da cobranca local
- permitir segunda via
- gerar cobrancas de taxa condominial em lote

## Fase 0 - Preparacao e alinhamento

### Objetivo

Fechar decisoes estruturais antes de qualquer alteracao tecnica mais sensivel.

### Entregas

- arquitetura oficial aprovada
- escolha do primeiro gateway
- decisao do modelo operacional por condominio
- definicao dos estados oficiais da cobranca
- definicao dos dados minimos do pagador
- definicao da entidade de responsabilidade financeira da unidade

### Dependencias

- documentacao arquitetural concluida

### Criterio de pronto

- toda a equipe sabe:
  - qual gateway sera usado primeiro
  - qual modelo de conta sera adotado
  - quais campos sao obrigatorios
  - quais ambientes existem

## Fase 1 - Complemento da modelagem fisica

### Objetivo

Preparar o banco e o dominio local do `EzView` para suportar boleto oficial.

### Entregas

- ampliar `financeiro_cobrancas`
- criar `unidades_responsaveis_financeiros`
- criar `financeiro_gateway_contas`
- criar `financeiro_webhook_logs`
- criar `financeiro_notificacoes`
- opcionalmente preparar `financeiro_anexos`

### Campos prioritarios

Em `financeiro_cobrancas`:

- `responsavel_financeiro_id`
- `gateway`
- `gateway_conta_id`
- `gateway_customer_id`
- `gateway_charge_id`
- `gateway_status`
- `billing_type`
- `external_reference`
- `linha_digitavel`
- `barcode`
- `boleto_url`
- `boleto_pdf_url`
- `paid_at`
- `cancelled_at`
- `ultima_sincronizacao_em`
- `segunda_via_de_cobranca_id`

### Dependencias

- conclusoes da Fase 0

### Criterio de pronto

- banco suportando cobranca oficial sem gambiarra
- historico atual preservado
- migracoes revisadas e reversiveis conceitualmente

## Fase 2 - Saneamento de dados e elegibilidade do pagador

### Objetivo

Garantir que nao tentaremos emitir boleto para contexto incompleto ou de teste.

### Entregas

- regra de elegibilidade financeira por condominio
- regra de elegibilidade do pagador
- regra de elegibilidade do responsavel financeiro da unidade
- validacao de:
  - `tipo_pagador`
  - `nome_completo`
  - `cpf_cnpj`
  - `email`
  - `telefone_principal`
  - `logradouro`
  - `numero`
  - `bairro`
  - `cidade`
  - `uf`
  - `cep`
- flag de producao por condominio
- flag de ativo para cobranca no responsavel financeiro
- flag de `recebe_cobranca`
- politica de congelamento ou reaproveitamento dos dados do pagador

### Dependencias

- modelagem fisica da Fase 1

### Criterio de pronto

- sistema bloqueia emissao oficial para dados incompletos
- massa de teste atual nao entra em producao por acidente

## Fase 3 - Camada de abstracao do gateway

### Objetivo

Criar a base tecnica para integrar um provedor sem acoplar o sistema inteiro a ele.

### Entregas

- contrato interno do provider
- adaptador do primeiro gateway
- configuracao dos ambientes do gateway: `sandbox` e `production`
- padrao de erros e retentativas

### Responsabilidades da camada

- criar cliente
- consultar cliente
- criar cobranca
- consultar cobranca
- cancelar cobranca
- emitir segunda via
- obter linha digitavel
- obter boleto PDF/URL
- normalizar retorno do provedor

### Dependencias

- Fases 0, 1 e 2

### Criterio de pronto

- o dominio financeiro interno consegue chamar o provider sem conhecer detalhes do gateway

## Fase 4 - Emissao oficial de boleto para reserva com taxa

### Objetivo

Dar o primeiro uso real ao boleto dentro de um fluxo ja existente e controlado.

### Entregas

- emissao oficial para cobrancas de `Reservas`
- persistencia do `gateway_customer_id`
- persistencia do `gateway_charge_id`
- armazenamento de:
  - linha digitavel
  - boleto_url
  - boleto_pdf_url
- evento financeiro append-only de emissao

### Fluxo controlado

1. reserva com taxa gera cobranca
2. sistema verifica elegibilidade
3. sistema vincula `responsavel_financeiro_id`
4. provider cria cliente/cobranca
5. `EzView` registra dados do boleto
6. `EzView` notifica o morador

### Dependencias

- Fases 1, 2 e 3

### Criterio de pronto

- uma reserva com taxa consegue gerar boleto oficial em sandbox
- cobranca local fica sincronizada com os identificadores do gateway

## Fase 5 - Notificacao automatica

### Objetivo

Entregar o boleto pelo relacionamento oficial da plataforma.

### Entregas

- inbox interno com dados da cobranca
- email automatico com link seguro ou segunda via
- opcionalmente integracao complementar com notificacao do gateway

### Canais obrigatorios

- inbox do `EzView`
- email do `EzView`

### Dependencias

- Fase 4

### Criterio de pronto

- cobranca emitida chega ao morador por canais da propria plataforma

## Fase 6 - Webhooks e sincronizacao de status

### Objetivo

Tornar o sistema confiavel quanto a pagamento, vencimento e eventos do gateway.

### Entregas

- endpoint tecnico de webhook
- persistencia de payload bruto
- validacao de autenticidade
- idempotencia
- reprocessamento
- atualizacao do `status` local
- novos eventos em `financeiro_eventos`

### Casos minimos a tratar

- boleto emitido
- pagamento confirmado
- cobranca vencida
- cobranca cancelada
- segunda via emitida, quando aplicavel

### Dependencias

- Fases 3, 4 e 5

### Criterio de pronto

- status de pagamento deixa de depender de acao manual para refletir a verdade operacional

## Fase 7 - Segunda via

### Objetivo

Permitir reemissao com rastreabilidade.

### Entregas

- endpoint de segunda via
- novo vencimento, quando permitido
- vinculo com a cobranca original
- registro da operacao no historico

### Dependencias

- Fases 4 e 6

### Criterio de pronto

- segunda via pode ser gerada sem apagar trilha anterior

## Fase 8 - Taxa condominial em lote

### Objetivo

Levar a infraestrutura criada para o caso mais estruturante do produto.

### Entregas

- geracao mensal por unidade ativa
- lote de cobrancas
- controle de referencia mensal
- envio automatico
- leitura administrativa por lote e por unidade

### Dependencias

- Fases 1 a 7 estabilizadas

### Criterio de pronto

- o sistema gera um lote mensal consistente e auditavel

## Fase 9 - Homologacao por condominio

### Objetivo

Ativar o financeiro real de forma gradual, segura e reversivel.

### Entregas

- checklist de onboarding por condominio
- validacao dos dados fiscais e financeiros
- habilitacao por flag
- teste controlado em sandbox
- ativacao limitada em producao

### Regras

- nenhum condominio entra automaticamente em producao
- nenhuma massa de teste e promovida sem revisao

### Criterio de pronto

- existe processo claro para colocar um condominio em producao sem improviso

## Ordem recomendada resumida

1. Preparacao
2. Modelagem fisica
3. Elegibilidade de dados
4. Camada de abstracao
5. Emissao para reservas
6. Notificacao
7. Webhook
8. Segunda via
9. Taxa condominial em lote
10. Homologacao por condominio

## Dependencias criticas

### Tecnicas

- banco preparado
- emails operacionais confiaveis
- dominio financeiro isolado de `Reservas`
- infraestrutura de webhook

### De negocio

- gateway escolhido
- modelo de conta definido
- governanca de producao decidida
- aprovacao do fluxo de comunicacao ao morador

## Riscos principais

- emitir cobranca para dados incompletos
- atualizar status sem idempotencia
- confundir `status` interno com `gateway_status`
- depender apenas do provedor para notificar o morador
- ativar producao com massa de teste

## O que nao deve acontecer

- boleto gerado diretamente pelo front
- pagamento confirmado apenas por clique manual sem retorno do gateway
- uso de credencial do gateway fora do backend
- mistura de moradores de teste com condominio em producao

## Indicadores de sucesso

- cobranca emitida com dados completos
- boleto entregue ao morador por canais do `EzView`
- webhook recebido e processado sem duplicidade
- historico completo da cobranca
- segunda via rastreavel
- taxa condominial futura com base pronta

## Proximo passo recomendado

Antes de qualquer codigo de integracao externa:

- transformar este plano em checklist tecnico de execucao
- escolher oficialmente o primeiro gateway
- desenhar a migracao fisica complementar do banco
