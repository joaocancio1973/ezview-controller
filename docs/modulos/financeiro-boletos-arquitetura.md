# Arquitetura Oficial - Financeiro com Boletos

## Objetivo

Definir a arquitetura oficial do dominio financeiro do `EzView` para cobrancas com boleto, notificacao automatica, retorno por webhook e governanca administrativa.

Este documento existe para orientar a implementacao futura sem improviso, reduzindo risco de falhas operacionais, financeiras e de integracao.

## Principio central

O boleto nao deve nascer como um simples arquivo gerado pela interface.

No `EzView`, boleto deve ser tratado como:

- cobranca financeira formal
- entidade auditavel
- integracao oficial com gateway
- fluxo automatizado de emissao, entrega, baixa e historico

## Escopo desta arquitetura

Esta arquitetura cobre:

- cobrancas de reservas com taxa
- cobrancas futuras de taxa condominial
- emissao de boleto por API
- recepcao de webhooks
- segunda via
- envio automatico para pagadores ativos
- conciliacao operacional basica por status

Esta arquitetura ainda nao cobre:

- split financeiro complexo
- repasses multiempresa
- antecipacao de recebiveis
- negativacao
- nota fiscal
- Pix transacional definitivo

## Modelo operacional recomendado

### Opcao A - conta central

A plataforma centraliza o recebimento e trata internamente repasses e conciliacoes.

Vantagens:

- onboarding mais simples
- menos exigencias iniciais por condominio

Desvantagens:

- governanca financeira mais sensivel
- conciliacao e repasses mais pesados
- maior risco operacional

### Opcao B - conta propria ou subconta por condominio

Cada condominio recebe em sua propria conta ou subconta no gateway, enquanto o `EzView` apenas orquestra a operacao.

Vantagens:

- melhor separacao entre condominios
- mais escalavel
- mais profissional para operacao multi-tenant
- reduz contaminacao financeira entre clientes

Desvantagens:

- onboarding mais detalhado
- exigencia maior de configuracao por condominio

### Decisao recomendada

O modelo oficial recomendado para a evolucao do `EzView` e:

- `subconta por condominio`, ou estrutura equivalente no gateway escolhido

## Gateway e abstracao

O sistema nao deve nascer acoplado demais a um unico provedor.

### Regra oficial

- o `EzView` deve trabalhar com um primeiro provedor operacional
- mas a integracao deve nascer por camada de abstracao

### Estrutura conceitual recomendada

- dominio financeiro do `EzView`
- adaptador de gateway
- notificacao e mensageria

### Provedor inicial sugerido

Para a fase 1 de integracao oficial, o primeiro provedor sugerido e o `Asaas`, por ja oferecer com documentacao oficial:

- cadastro de cliente
- criacao de cobranca por boleto
- URL do boleto em PDF
- linha digitavel
- webhooks
- notificacoes por cliente
- subcontas

## Camadas da arquitetura

### Camada 1 - dominio financeiro interno

Responsavel por:

- regras de cobranca
- estados oficiais da cobranca
- historico append-only
- integracao com `Reservas`
- integracao futura com taxa condominial
- exposicao administrativa no `EzView`

### Camada 2 - adaptador do gateway

Responsavel por:

- criar cliente no provedor
- criar cobranca
- consultar cobranca
- obter linha digitavel
- obter URL/PDF do boleto
- cancelar cobranca
- emitir segunda via
- tratar webhooks

### Camada 3 - notificacao e relacionamento

Responsavel por:

- inbox interno
- email
- notificacoes operacionais
- eventual envio complementar do proprio gateway

## Entidades que devem existir

### Ja existentes

- `financeiro_cobrancas`
- `financeiro_eventos`

### Complementares recomendadas

- `financeiro_gateway_contas`
- `financeiro_webhook_logs`
- `financeiro_notificacoes`
- `financeiro_anexos`

## Campos obrigatorios para cobranca oficial com boleto

Em `financeiro_cobrancas`, a cobranca deve estar preparada para armazenar:

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
- `nosso_numero`, quando o provedor expuser
- `vencimento_em`
- `valor`
- `multa_valor`
- `juros_valor`
- `desconto_valor`
- `paid_at`
- `cancelled_at`
- `ultima_sincronizacao_em`
- `segunda_via_de_cobranca_id`, quando houver

## Dados minimos do pagador

Para emissao oficial de boleto, o pagador precisa ter dados consistentes.

Campos minimos recomendados:

- nome completo
- CPF ou CNPJ
- email
- telefone ou celular
- endereco
- numero
- bairro
- CEP

Sem esses dados, a cobranca nao deve ser enviada para producao.

## Estados oficiais da cobranca

Estados recomendados:

- `rascunho`
- `pendente`
- `emitido`
- `em_analise`
- `pago`
- `isento`
- `cancelado`
- `rejeitado`
- `vencido`

Observacao:

- `gateway_status` pode existir em paralelo ao `status` interno
- o `status` interno e a leitura oficial do `EzView`

## Fluxo oficial - reserva com taxa

1. a reserva com taxa e criada
2. nasce a cobranca em `financeiro_cobrancas`
3. o adaptador do gateway cria cliente ou reutiliza cliente existente
4. o adaptador cria a cobranca boleto
5. o sistema salva:
   - id do cliente no gateway
   - id da cobranca no gateway
   - linha digitavel
   - URL do boleto
   - URL/PDF do boleto
6. o `EzView` registra evento financeiro
7. o `EzView` envia notificacoes
8. o webhook do gateway atualiza a cobranca quando houver mudanca
9. a reserva sincroniza apenas o necessario com o financeiro

## Fluxo oficial - taxa condominial

1. o motor mensal gera uma cobranca por unidade ativa
2. cada cobranca nasce vinculada ao condominio, unidade e responsavel
3. o gateway gera o boleto
4. o sistema dispara notificacoes
5. o morador pode acessar segunda via
6. o webhook confirma pagamento ou vencimento
7. o `EzView` atualiza status, historico e leitura administrativa

## Webhooks

Webhook deve ser tratado como fonte primaria de sincronizacao de status.

### Regras oficiais

- todo webhook recebido deve ser persistido em log
- o processamento deve ser idempotente
- falhas devem permitir reprocessamento
- status de pagamento nunca deve depender apenas de acao manual no front

### Estrutura recomendada de log

Em `financeiro_webhook_logs`:

- `id`
- `gateway`
- `gateway_evento`
- `gateway_charge_id`
- `payload_json`
- `recebido_em`
- `processado_em`
- `status_processamento`
- `erro_processamento`

## Notificacao automatica

O envio de boleto nao deve depender apenas do gateway.

### Canais oficiais recomendados

- inbox interno do `EzView`
- email do `EzView`
- notificacao do proprio gateway, quando configurada

### Regra

O canal oficial de relacionamento com o morador deve continuar sendo o `EzView`.

O gateway atua como complemento operacional, nao como substituto da comunicacao da plataforma.

## Segunda via

O modulo deve prever segunda via de boleto.

Comportamento recomendado:

- registrar a geracao da nova via
- preservar a cobranca anterior no historico
- manter rastreabilidade do que foi substituido
- refletir novo vencimento, quando aplicavel

## Ambiente e governanca

### Ambientes

Devem existir:

- `sandbox`
- `production`

### Regra por condominio

Cada condominio deve possuir:

- flag de habilitacao financeira
- conta ou subconta configurada
- dados fiscais e de cobranca consistentes
- aprovacao explicita para entrar em producao

### Regra para massa atual

Os moradores reais atualmente cadastrados, usados apenas para exercicio do sistema, nao devem entrar em fluxo automatico de producao sem ativacao formal do condominio e do contexto financeiro.

## Regras de seguranca

- a chave da API deve viver apenas no backend
- nunca expor credencial no frontend
- validar assinatura ou autenticidade do webhook
- registrar tentativas e erros
- impedir geracao automatica para pagador inativo
- permitir desligar automaticamente cobrancas de teste

## Requisitos para considerar o modulo pronto para boleto oficial

- cobranca formal consolidada
- dados minimos do pagador validados
- gateway integrado por adaptador
- webhook persistido e reprocessavel
- segunda via prevista
- notificacao automatica ativa
- historico financeiro auditavel
- ambiente de sandbox homologado
- ativacao por condominio controlada

## Ordem recomendada de implementacao futura

### Etapa 1

- consolidar arquitetura e regras
- complementar modelagem fisica

### Etapa 2

- criar camada de gateway
- integrar cliente e cobranca boleto

### Etapa 3

- receber e processar webhooks
- gerar segunda via

### Etapa 4

- envio automatico por inbox e email
- lote de taxa condominial

### Etapa 5

- homologacao por condominio
- ativacao gradual em producao

## Sintese

No `EzView`, boleto deve nascer como uma operacao financeira completa:

- rastreavel
- automatizada
- segura
- isolada por condominio
- pronta para crescer para taxa condominial e outros meios de pagamento
