# Checklist Tecnico de Execucao - Financeiro com Boletos

## Objetivo

Traduzir o plano de implementacao do financeiro com boletos em uma lista objetiva de verificacao para execucao tecnica.

## Gateway oficial da fase 1

- [x] Gateway inicial escolhido: `Asaas`
- [x] Modelo operacional recomendado: `subconta por condominio`
- [ ] Confirmar ambiente de sandbox funcional
- [ ] Confirmar fluxo regulatorio e limites iniciais de subconta

## Etapa 0 - Preparacao

- [x] Arquitetura oficial documentada
- [x] Plano por fases documentado
- [ ] Lista oficial dos estados internos consolidada no codigo
- [ ] Lista oficial dos `gateway_status` mapeados
- [ ] Definir responsavel por homologacao financeira

## Etapa 1 - Banco de dados

- [ ] Criar `unidades_responsaveis_financeiros`
- [ ] Expandir `financeiro_cobrancas` com campos de gateway
- [ ] Criar `financeiro_gateway_contas`
- [ ] Criar `financeiro_webhook_logs`
- [ ] Criar `financeiro_notificacoes`
- [ ] Avaliar necessidade imediata de `financeiro_anexos`
- [ ] Garantir migracoes seguras e reversiveis conceitualmente

## Etapa 2 - Elegibilidade de dados

- [ ] Validar `tipo_pagador`
- [ ] Validar `nome_completo`
- [ ] Validar `cpf_cnpj`
- [ ] Validar email
- [ ] Validar `telefone_principal`
- [ ] Validar `logradouro`
- [ ] Validar `numero`
- [ ] Validar `bairro`
- [ ] Validar `cidade`
- [ ] Validar `uf`
- [ ] Validar `cep`
- [ ] Validar `ativo_para_cobranca`
- [ ] Validar `recebe_cobranca`
- [ ] Criar regra de bloqueio para dados incompletos
- [ ] Criar flag de producao por condominio
- [ ] Garantir que a massa atual de teste nao entra em producao

## Etapa 3 - Camada de abstracao

- [ ] Definir interface do provider
- [ ] Implementar adaptador `Asaas`
- [ ] Separar configuracao do gateway entre `sandbox` e `production`
- [ ] Padronizar erros tecnicos do provider
- [ ] Padronizar retentativas e timeouts

## Etapa 4 - Emissao de boleto para reservas

- [ ] Vincular `responsavel_financeiro_id` antes da emissao
- [ ] Gerar cliente no gateway quando necessario
- [ ] Reutilizar cliente quando ja existir
- [ ] Criar cobranca boleto para reserva com taxa
- [ ] Persistir `gateway_customer_id`
- [ ] Persistir `gateway_charge_id`
- [ ] Persistir `linha_digitavel`
- [ ] Persistir `boleto_url`
- [ ] Persistir `boleto_pdf_url`
- [ ] Registrar evento financeiro de emissao
- [ ] Garantir atomicidade local entre cobranca, `responsavel_financeiro_id`, evento e tentativa de emissao

## Etapa 5 - Notificacoes

- [ ] Gerar mensagem no inbox com dados da cobranca
- [ ] Enviar email automatico ao morador
- [ ] Definir politica de reenvio
- [ ] Registrar historico de notificacao
- [ ] Nao depender exclusivamente das notificacoes do gateway

## Etapa 6 - Webhooks

- [ ] Criar endpoint tecnico de webhook
- [ ] Persistir payload bruto recebido
- [ ] Validar autenticidade do webhook
- [ ] Implementar idempotencia
- [ ] Implementar reprocessamento
- [ ] Atualizar `status` interno da cobranca
- [ ] Registrar novos eventos financeiros
- [ ] Cobrir ao menos:
  - [ ] boleto emitido
  - [ ] pagamento confirmado
  - [ ] cobranca vencida
  - [ ] cobranca cancelada

## Etapa 7 - Segunda via

- [ ] Criar fluxo oficial de segunda via
- [ ] Preservar vinculo com cobranca original
- [ ] Registrar historico da reemissao
- [ ] Atualizar linha digitavel e PDF quando necessario

## Etapa 8 - Taxa condominial

- [ ] Definir referencia mensal da cobranca
- [ ] Gerar lote por unidade ativa
- [ ] Permitir leitura administrativa por lote
- [ ] Integrar envio automatico
- [ ] Integrar baixa por webhook

## Etapa 9 - Homologacao por condominio

- [ ] Criar checklist de onboarding financeiro do condominio
- [ ] Validar conta/subconta configurada
- [ ] Validar dados fiscais minimos
- [ ] Testar reserva com taxa em sandbox
- [ ] Testar notificacao
- [ ] Testar webhook
- [ ] Testar segunda via
- [ ] Liberar producao apenas por flag explicita

## Criterios minimos para dizer que o boleto esta pronto

- [ ] boleto emitido oficialmente por API
- [ ] cobranca rastreavel no banco
- [ ] notificacao automatica funcionando
- [ ] webhook atualizando status sem duplicidade
- [ ] segunda via pronta
- [ ] fluxo de reserva com taxa estabilizado

## Criterios minimos para taxa condominial

- [ ] lote mensal gerado
- [ ] cobrancas por unidade ativa emitidas
- [ ] entrega automatica funcionando
- [ ] retorno de pagamento processado
- [ ] leitura administrativa consistente
