# Plano Final de Conclusao - Financeiro

## Objetivo

Consolidar a trilha final do modulo `Financeiro` do `EzView`, organizando:

- o que ja esta pronto
- o que ainda falta
- a ordem ideal de fechamento
- os criterios reais para considerar o financeiro concluido

Este documento existe como visao executiva de encerramento do capitulo financeiro.

## Estado atual do modulo

O `Financeiro` ja possui uma base funcional e estrutural madura.

### Ja esta pronto

- dominio financeiro proprio, separado de `Reservas`
- `financeiro_cobrancas`
- `financeiro_eventos`
- integracao com `Reservas`
- integracao com `Mensagens`
- tela administrativa para `admin`
- filtros, busca, paginacao e impressao simples
- detalhe da cobranca com historico
- arquitetura de boletos documentada
- plano de implementacao documentado
- checklist tecnico documentado
- modelagem logica e fisica documentadas
- migration estrutural da fase 2 aplicada no banco
- entidade `unidades_responsaveis_financeiros`
- painel administrativo de `responsavel financeiro da unidade`
- leitura de ocupacao da unidade
- destaque do morador principal de referencia
- autopreenchimento de endereco por `CEP`

### Ja existe, mas ainda nao esta concluido

- governanca de elegibilidade para cobranca
- campos e estados de gateway no banco
- base para webhook
- base para notificacao financeira
- base para segunda via

## O que ainda falta

### Bloco 1 - Refino funcional do financeiro atual

- revisar textos e estados da tela
- deixar mais explicito:
  - `elegivel`
  - `pendente`
  - `nao configurado`
- melhorar leitura do detalhe da cobranca
- mostrar contexto do pagador de forma mais clara
- reforcar relatorio de impressao

### Bloco 2 - Elegibilidade de cobranca

- regra consolidada de quando a unidade pode cobrar
- regra consolidada de quando o responsavel financeiro esta apto
- validacao completa de dados do pagador
- bloqueio visual e funcional de cobranca incompleta
- resumo administrativo por condominio:
  - aptos
  - pendentes
  - bloqueados

### Bloco 3 - Comprovantes e anexos

- upload de comprovante por cobranca
- vinculacao ao historico financeiro
- leitura administrativa no detalhe
- base para analise manual mais forte

### Bloco 4 - Gateway oficial

- cadastro de conta do gateway por condominio
- camada de abstracao do provider
- adaptador do gateway escolhido
- emissao real de boleto
- armazenamento de:
  - linha digitavel
  - PDF
  - URL
  - ids externos

### Bloco 5 - Webhook e sincronizacao oficial

- endpoint tecnico de webhook
- idempotencia
- persistencia de payload bruto
- reprocessamento
- atualizacao de status por verdade externa

### Bloco 6 - Segunda via

- fluxo de reemissao
- vinculo com cobranca original
- historico e rastreabilidade

### Bloco 7 - Taxa condominial

- geracao mensal em lote
- referencia mensal
- leitura por lote e por unidade
- entrega automatica
- baixa por webhook

## Ordem ideal de conclusao

### Etapa 1 - Refino funcional e visual

Objetivo:

- deixar o modulo mais claro para operacao

Entregas:

- ajustes de UX
- detalhe da cobranca melhor exposto
- elegibilidade mais evidente
- resumo administrativo por condominio

Motivo para vir primeiro:

- reduz ambiguidade
- facilita teste
- melhora entendimento antes da integracao externa

### Etapa 2 - Comprovantes e anexos

Objetivo:

- fortalecer a operacao manual antes do gateway real

Entregas:

- upload
- leitura
- historico de comprovantes

Motivo:

- reserva com taxa ja ganha maturidade
- admin passa a operar melhor o financeiro atual

### Etapa 3 - Conta financeira do condominio

Objetivo:

- preparar a governanca do gateway

Entregas:

- cadastro da conta/subconta
- estado por condominio:
  - teste
  - producao
  - pendente

### Etapa 4 - Emissao real de boleto

Objetivo:

- transformar cobranca local em cobranca oficial por API

Entregas:

- criacao de cliente
- criacao de cobranca
- persistencia dos ids externos
- linha digitavel
- boleto PDF/URL

### Etapa 5 - Webhook

Objetivo:

- tornar o status financeiro confiavel

Entregas:

- endpoint
- validacao
- idempotencia
- sincronizacao de status

### Etapa 6 - Segunda via

Objetivo:

- dar autonomia operacional ao admin e ao morador

### Etapa 7 - Taxa condominial

Objetivo:

- levar a infraestrutura a um uso recorrente e estruturante

## O que e bloqueador

Para boleto oficial, estes itens sao bloqueadores reais:

- responsavel financeiro consistente
- dados minimos completos do pagador
- conta financeira configurada
- camada de provider pronta
- webhook com idempotencia

Sem isso, o sistema pode ate emitir tecnicamente, mas nao estara pronto de forma profissional.

## O que nao deve ser pulado

- elegibilidade administrativa
- trilha de eventos
- logs de webhook
- separacao entre `status` interno e `gateway_status`
- homologacao por condominio

## Criterio de conclusao do financeiro

O capitulo `Financeiro` so deve ser considerado concluido quando:

### Financeiro operacional

- o admin consegue governar cobrancas com clareza
- o responsavel financeiro da unidade esta bem definido
- a elegibilidade de cobranca esta visivel e confiavel
- comprovantes podem ser anexados e analisados

### Boleto oficial

- o sistema emite boleto real por API
- salva linha digitavel, URL e PDF
- registra ids externos
- atualiza status via webhook
- trata duplicidade com idempotencia
- permite segunda via com historico

### Taxa condominial

- o sistema gera lote mensal consistente
- entrega as cobrancas
- processa retorno de pagamento
- preserva leitura administrativa por unidade e por lote

## Recomendacao objetiva de execucao

Se o objetivo e concluir o financeiro com seguranca, a ordem recomendada e:

1. refino funcional e visual
2. comprovantes e anexos
3. elegibilidade consolidada por unidade
4. conta financeira do condominio
5. emissao real de boleto
6. webhook
7. segunda via
8. taxa condominial

## Resultado esperado ao fim

Ao final dessa trilha, o `EzView` deve ter um modulo financeiro:

- auditavel
- administravel
- pronto para boleto oficial
- preparado para taxa condominial
- e consistente para futura expansao mobile e multi-interface
