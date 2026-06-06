# Checklist Final de Conclusao - Financeiro

## Objetivo

Organizar a reta final do modulo `Financeiro` do `EzView` em tarefas objetivas, com estado visivel e ordem recomendada de execucao.

Este documento deve servir como checklist final de fechamento do capitulo financeiro.

## Como ler este checklist

- `[x]` concluido
- `[/]` em andamento ou parcialmente pronto
- `[ ]` pendente

## Estado atual consolidado

### Fundacao do modulo

- [x] dominio financeiro proprio separado de `Reservas`
- [x] `financeiro_cobrancas` operando
- [x] `financeiro_eventos` operando
- [x] integracao inicial com `Reservas`
- [x] integracao inicial com `Mensagens`
- [x] tela administrativa de cobrancas para `admin`
- [x] filtros, busca, paginacao e impressao simples
- [x] detalhe da cobranca com historico

### Responsavel financeiro da unidade

- [x] entidade `unidades_responsaveis_financeiros`
- [x] painel administrativo para configurar o responsavel financeiro
- [x] leitura de ocupacao da unidade
- [x] destaque do morador principal de referencia
- [x] autopreenchimento de endereco por `CEP`
- [x] atualizacao do `responsavel_financeiro_id` nas cobrancas locais

### Comprovantes

- [x] migration de `financeiro_anexos`
- [x] upload administrativo de comprovantes por cobranca
- [x] leitura dos comprovantes no detalhe da cobranca
- [x] evento financeiro append-only de comprovante anexado

### Arquitetura e documentacao

- [x] arquitetura oficial de boletos documentada
- [x] plano de implementacao documentado
- [x] checklist tecnico de boletos documentado
- [x] modelagem logica documentada
- [x] modelagem fisica documentada
- [x] plano final de conclusao documentado

## O que ainda falta para fechar o modulo

### Bloco 1 - Elegibilidade financeira por unidade

- [ ] consolidar regra oficial de `apta para cobranca`
- [ ] consolidar regra oficial de `pendente`
- [ ] consolidar regra oficial de `bloqueada`
- [ ] exibir resumo por condominio:
  - [ ] aptas
  - [ ] pendentes
  - [ ] bloqueadas
- [ ] deixar o motivo do bloqueio visivel por unidade
- [ ] tratar validacao completa de dados do pagador com leitura mais amigavel

### Bloco 2 - Refino final da experiencia administrativa

- [/] detalhe da cobranca melhor exposto
- [/] modal de detalhe mais compacto
- [ ] revisar textos e estados para leitura operacional mais rapida
- [ ] revisar relatorio de impressao com foco gerencial
- [ ] revisar responsividade do `Financeiro` em tela menor

### Bloco 3 - Conta financeira do condominio

- [ ] tela administrativa de `financeiro_gateway_contas`
- [ ] cadastrar conta/subconta financeira por condominio
- [ ] exibir estado da conta:
  - [ ] teste
  - [ ] producao
  - [ ] pendente
- [ ] impedir emissao oficial sem conta financeira apta

### Bloco 4 - Emissao real de boleto

- [ ] camada de abstracao do provider
- [ ] adaptador oficial do primeiro gateway
- [ ] criacao ou reutilizacao de cliente no gateway
- [ ] emissao de cobranca boleto para `Reservas`
- [ ] persistencia de:
  - [ ] `gateway_customer_id`
  - [ ] `gateway_charge_id`
  - [ ] `linha_digitavel`
  - [ ] `boleto_url`
  - [ ] `boleto_pdf_url`
- [ ] evento financeiro append-only de emissao

### Bloco 5 - Webhook e sincronizacao

- [ ] endpoint tecnico de webhook
- [ ] persistencia do payload bruto
- [ ] validacao de autenticidade
- [ ] idempotencia
- [ ] reprocessamento seguro
- [ ] atualizacao do `status` interno da cobranca
- [ ] cobertura minima de eventos:
  - [ ] boleto emitido
  - [ ] pagamento confirmado
  - [ ] cobranca vencida
  - [ ] cobranca cancelada

### Bloco 6 - Segunda via

- [ ] gerar segunda via oficial
- [ ] preservar vinculo com cobranca original
- [ ] registrar historico da reemissao
- [ ] atualizar PDF e linha digitavel quando aplicavel

### Bloco 7 - Taxa condominial

- [ ] definir referencia mensal
- [ ] gerar lote por unidade ativa
- [ ] leitura por lote e por unidade
- [ ] envio automatico
- [ ] baixa por webhook

## Ordem recomendada para concluir

### Etapa 1 - Fechar a elegibilidade

Meta:

- parar de depender de interpretacao manual para saber se a unidade pode ou nao pode entrar em cobranca

Tarefas:

- [ ] criar resumo por condominio
- [ ] criar situacao final por unidade
- [ ] exibir motivos de bloqueio

### Etapa 2 - Fechar o acabamento administrativo

Meta:

- deixar a operacao do `admin` rapida, clara e segura

Tarefas:

- [ ] revisar detalhe da cobranca
- [ ] revisar textos e nomenclaturas
- [ ] revisar relatorio de impressao

### Etapa 3 - Abrir a conta financeira do condominio

Meta:

- preparar a base do gateway sem ainda misturar tudo com emissao

Tarefas:

- [ ] governanca da conta financeira
- [ ] estado por condominio
- [ ] bloqueios de emissao quando a conta nao estiver pronta

### Etapa 4 - Entrar no boleto real

Meta:

- transformar a cobranca local em cobranca oficial por API

Tarefas:

- [ ] provider
- [ ] emissao
- [ ] persistencia dos ids externos
- [ ] registro do boleto

### Etapa 5 - Fechar webhook

Meta:

- tornar o status financeiro confiavel e automatico

Tarefas:

- [ ] endpoint
- [ ] idempotencia
- [ ] sincronizacao
- [ ] logs

### Etapa 6 - Fechar segunda via

Meta:

- dar autonomia operacional sem perda de historico

### Etapa 7 - Levar para taxa condominial

Meta:

- concluir o modulo no uso recorrente e estruturante do produto

## Bloqueadores reais

Sem estes pontos, o modulo nao deve ser considerado concluido:

- [ ] elegibilidade consolidada por unidade
- [ ] conta financeira do condominio
- [ ] emissao real de boleto
- [ ] webhook com idempotencia
- [ ] segunda via rastreavel

## Criterio final de pronto

O `Financeiro` so deve ser considerado encerrado quando:

- [ ] o `admin` consegue operar cobrancas com clareza
- [ ] a unidade tem leitura objetiva de prontidao para cobranca
- [ ] comprovantes podem ser anexados e analisados
- [ ] boleto real e emitido por API
- [ ] o sistema atualiza status por webhook sem duplicidade
- [ ] existe segunda via com historico
- [ ] taxa condominial em lote esta pronta

## Proximo passo recomendado agora

O passo mais coerente para retomada imediata e:

- [ ] implementar `elegibilidade financeira por unidade e por condominio`

Motivo:

- reduz risco
- melhora governanca
- prepara a emissao real
- deixa o modulo mais profissional antes do gateway
