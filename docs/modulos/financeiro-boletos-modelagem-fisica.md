# Proposta de Modelagem Fisica - Financeiro com Boletos

## Objetivo

Definir a proposta de modelagem fisica do dominio financeiro com boletos no `EzView`, sem ainda aplicar migracao real no banco.

Este documento cobre:

- tabela `unidades_responsaveis_financeiros`
- alteracoes em `financeiro_cobrancas`
- indices sugeridos
- constraints sugeridas
- observacoes de integridade e atomicidade no nivel do banco

## Escopo da proposta

Esta proposta foi desenhada para suportar:

- reserva com taxa
- taxa condominial futura
- boleto oficial via gateway
- troca de responsavel financeiro sem perda de historico
- segunda via
- conciliacao por webhook

## Diretriz de transicao

Como a base atual ainda esta em fase embrionaria para moradores e pagadores reais, a primeira migracao oficial do banco deve priorizar seguranca operacional.

Isso significa:

- campos obrigatorios para producao podem nascer `NULL` no banco durante a transicao
- defaults de cobranca devem nascer bloqueados para producao acidental
- a elegibilidade oficial continua sendo garantida pelo backend antes da emissao

## Tabela nova - `unidades_responsaveis_financeiros`

### Finalidade

Formalizar a responsabilidade financeira da unidade e congelar o contexto do pagador no momento em que ele passa a ser elegivel para cobranca.

### Estrutura proposta

```sql
CREATE TABLE unidades_responsaveis_financeiros (
  id CHAR(36) NOT NULL PRIMARY KEY,
  condominio_id CHAR(36) NOT NULL,
  unidade_id CHAR(36) NOT NULL,
  usuario_id CHAR(36) NOT NULL,

  tipo_pagador ENUM('pf','pj') NOT NULL DEFAULT 'pf',
  nome_completo VARCHAR(160) NULL,
  cpf_cnpj VARCHAR(20) NULL,
  email VARCHAR(160) NULL,
  telefone_principal VARCHAR(30) NULL,
  telefone_whatsapp VARCHAR(30) NULL,

  cep VARCHAR(12) NULL,
  logradouro VARCHAR(160) NULL,
  numero VARCHAR(30) NULL,
  complemento VARCHAR(120) NULL,
  bairro VARCHAR(120) NULL,
  cidade VARCHAR(120) NULL,
  uf CHAR(2) NULL,

  ativo TINYINT(1) NOT NULL DEFAULT 1,
  ativo_para_cobranca TINYINT(1) NOT NULL DEFAULT 0,
  recebe_cobranca TINYINT(1) NOT NULL DEFAULT 0,
  preferencia_envio ENUM('email','inbox','email_e_inbox') NOT NULL DEFAULT 'email_e_inbox',
  ambiente_financeiro ENUM('teste','producao') NOT NULL DEFAULT 'teste',

  gateway_customer_id VARCHAR(80) NULL,
  gateway_conta_id CHAR(36) NULL,

  validado_em DATETIME NULL,
  validado_por CHAR(36) NULL,
  substitui_responsavel_id CHAR(36) NULL,
  observacao_financeira TEXT NULL,

  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  encerrado_em DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Chaves estrangeiras sugeridas

```sql
ALTER TABLE unidades_responsaveis_financeiros
  ADD CONSTRAINT fk_urf_condominio
    FOREIGN KEY (condominio_id) REFERENCES condominios(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_urf_unidade
    FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_urf_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_urf_gateway_conta
    FOREIGN KEY (gateway_conta_id) REFERENCES financeiro_gateway_contas(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_urf_validado_por
    FOREIGN KEY (validado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_urf_substitui
    FOREIGN KEY (substitui_responsavel_id) REFERENCES unidades_responsaveis_financeiros(id) ON DELETE SET NULL;
```

## Indices sugeridos para `unidades_responsaveis_financeiros`

```sql
CREATE INDEX idx_urf_condominio ON unidades_responsaveis_financeiros(condominio_id);
CREATE INDEX idx_urf_unidade ON unidades_responsaveis_financeiros(unidade_id);
CREATE INDEX idx_urf_usuario ON unidades_responsaveis_financeiros(usuario_id);
CREATE INDEX idx_urf_gateway_conta ON unidades_responsaveis_financeiros(gateway_conta_id);
CREATE INDEX idx_urf_cpf_cnpj ON unidades_responsaveis_financeiros(cpf_cnpj);
CREATE INDEX idx_urf_ativo_unidade ON unidades_responsaveis_financeiros(unidade_id, ativo);
CREATE INDEX idx_urf_cobranca_unidade ON unidades_responsaveis_financeiros(unidade_id, ativo_para_cobranca, recebe_cobranca);
CREATE INDEX idx_urf_ambiente ON unidades_responsaveis_financeiros(ambiente_financeiro);
```

## Constraints e regras de unicidade sugeridas

### Regra 1 - apenas um responsavel financeiro ativo por unidade

Em MySQL, essa regra pode nao ser totalmente resolvida apenas com `UNIQUE (unidade_id, ativo)`, porque haveria colisao para historicos inativos.

### Recomendacao

Tratar assim:

- manter indice composto `idx_urf_ativo_unidade`
- validar em nivel de aplicacao e servico que so exista um `ativo = 1` por unidade
- opcionalmente usar campo derivado `status_responsabilidade` no futuro se quisermos outra estrategia

### Regra 2 - nao duplicar o mesmo usuario como ativo na mesma unidade

Mesma observacao:

- evitar `UNIQUE (unidade_id, usuario_id, ativo)` como unica linha de defesa
- manter validacao forte em nivel de aplicacao

### Constraint sugerida no nivel do banco

```sql
ALTER TABLE unidades_responsaveis_financeiros
  ADD CONSTRAINT chk_urf_uf
    CHECK (CHAR_LENGTH(uf) = 2);
```

Observacao:

- `CHECK` depende da versao e do modo do MySQL
- se o ambiente ignorar `CHECK`, a validacao deve continuar no backend

## Alteracoes propostas em `financeiro_cobrancas`

### Novas colunas sugeridas

```sql
ALTER TABLE financeiro_cobrancas
  ADD COLUMN responsavel_financeiro_id CHAR(36) NULL AFTER usuario_id,
  ADD COLUMN gateway VARCHAR(40) NULL AFTER forma_cobranca,
  ADD COLUMN gateway_conta_id CHAR(36) NULL AFTER gateway,
  ADD COLUMN gateway_customer_id VARCHAR(80) NULL AFTER gateway_conta_id,
  ADD COLUMN gateway_charge_id VARCHAR(80) NULL AFTER gateway_customer_id,
  ADD COLUMN gateway_status VARCHAR(60) NULL AFTER gateway_charge_id,
  ADD COLUMN billing_type VARCHAR(40) NULL AFTER gateway_status,
  ADD COLUMN external_reference VARCHAR(120) NULL AFTER billing_type,
  ADD COLUMN linha_digitavel VARCHAR(120) NULL AFTER external_reference,
  ADD COLUMN barcode VARCHAR(120) NULL AFTER linha_digitavel,
  ADD COLUMN boleto_url TEXT NULL AFTER barcode,
  ADD COLUMN boleto_pdf_url TEXT NULL AFTER boleto_url,
  ADD COLUMN nosso_numero VARCHAR(80) NULL AFTER boleto_pdf_url,
  ADD COLUMN multa_valor DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER valor,
  ADD COLUMN juros_valor DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER multa_valor,
  ADD COLUMN desconto_valor DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER juros_valor,
  ADD COLUMN paid_at DATETIME NULL AFTER pago_em,
  ADD COLUMN cancelled_at DATETIME NULL AFTER paid_at,
  ADD COLUMN ultima_sincronizacao_em DATETIME NULL AFTER cancelled_at,
  ADD COLUMN segunda_via_de_cobranca_id CHAR(36) NULL AFTER ultima_sincronizacao_em;
```

### Observacao importante sobre `usuario_id`

`usuario_id` pode continuar existindo como redundancia operacional controlada para:

- listagens
- filtros
- relatorios
- telas legadas

Mas a origem oficial da responsabilidade financeira passa a ser:

- `responsavel_financeiro_id`

## Chaves estrangeiras sugeridas para `financeiro_cobrancas`

```sql
ALTER TABLE financeiro_cobrancas
  ADD CONSTRAINT fk_financeiro_cobranca_responsavel_financeiro
    FOREIGN KEY (responsavel_financeiro_id) REFERENCES unidades_responsaveis_financeiros(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_financeiro_cobranca_gateway_conta
    FOREIGN KEY (gateway_conta_id) REFERENCES financeiro_gateway_contas(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_financeiro_cobranca_segunda_via
    FOREIGN KEY (segunda_via_de_cobranca_id) REFERENCES financeiro_cobrancas(id) ON DELETE SET NULL;
```

## Indices sugeridos para `financeiro_cobrancas`

```sql
CREATE INDEX idx_financeiro_cobranca_responsavel_financeiro ON financeiro_cobrancas(responsavel_financeiro_id);
CREATE INDEX idx_financeiro_cobranca_gateway_conta ON financeiro_cobrancas(gateway_conta_id);
CREATE INDEX idx_financeiro_cobranca_gateway_charge ON financeiro_cobrancas(gateway_charge_id);
CREATE INDEX idx_financeiro_cobranca_gateway_status ON financeiro_cobrancas(gateway_status);
CREATE INDEX idx_financeiro_cobranca_vencimento_status ON financeiro_cobrancas(vencimento_em, status);
CREATE INDEX idx_financeiro_cobranca_condominio_status ON financeiro_cobrancas(condominio_id, status);
CREATE INDEX idx_financeiro_cobranca_unidade_status ON financeiro_cobrancas(unidade_id, status);
CREATE INDEX idx_financeiro_cobranca_external_reference ON financeiro_cobrancas(external_reference);
CREATE INDEX idx_financeiro_cobranca_paid_at ON financeiro_cobrancas(paid_at);
```

### Unicidades recomendadas

```sql
CREATE UNIQUE INDEX uk_financeiro_cobranca_gateway_charge ON financeiro_cobrancas(gateway, gateway_charge_id);
```

Observacoes:

- manter `uk_financeiro_cobranca_reserva (reserva_id)` enquanto a regra continuar sendo uma cobranca principal por reserva
- se no futuro houver parcelamento ou multiplas emissoes estruturais por reserva, essa decisao deve ser revista

## Tabela proposta - `financeiro_gateway_contas`

### Finalidade

Representar a conta ou subconta financeira oficial do condominio no gateway.

### Estrutura proposta

```sql
CREATE TABLE financeiro_gateway_contas (
  id CHAR(36) NOT NULL PRIMARY KEY,
  condominio_id CHAR(36) NOT NULL,
  gateway VARCHAR(40) NOT NULL,
  ambiente_gateway ENUM('sandbox','production') NOT NULL DEFAULT 'sandbox',
  gateway_account_id VARCHAR(80) NOT NULL,
  api_key_ref VARCHAR(120) NULL,
  status_operacional ENUM('pendente','em_analise','ativa','restrita','inativa') NOT NULL DEFAULT 'pendente',
  webhook_url_oficial VARCHAR(255) NULL,
  webhook_ativo TINYINT(1) NOT NULL DEFAULT 0,
  onboarding_concluido TINYINT(1) NOT NULL DEFAULT 0,
  observacao_interna TEXT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_financeiro_gateway_conta (gateway, ambiente_gateway, gateway_account_id),
  KEY idx_financeiro_gateway_conta_condominio (condominio_id),
  KEY idx_financeiro_gateway_conta_status (status_operacional),
  CONSTRAINT fk_financeiro_gateway_conta_condominio
    FOREIGN KEY (condominio_id) REFERENCES condominios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Tabela proposta - `financeiro_webhook_logs`

### Finalidade

Persistir o payload bruto, o estado de processamento e permitir reprocessamento seguro.

### Estrutura proposta

```sql
CREATE TABLE financeiro_webhook_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  condominio_id CHAR(36) NULL,
  gateway VARCHAR(40) NOT NULL,
  gateway_conta_id CHAR(36) NULL,
  gateway_evento VARCHAR(80) NOT NULL,
  gateway_charge_id VARCHAR(80) NULL,
  assinatura_recebida VARCHAR(255) NULL,
  payload_json JSON NOT NULL,
  hash_idempotencia VARCHAR(120) NULL,
  status_processamento ENUM('recebido','processado','ignorado','erro') NOT NULL DEFAULT 'recebido',
  erro_processamento TEXT NULL,
  recebido_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processado_em DATETIME NULL,
  KEY idx_financeiro_webhook_gateway (gateway),
  KEY idx_financeiro_webhook_charge (gateway_charge_id),
  KEY idx_financeiro_webhook_status (status_processamento),
  KEY idx_financeiro_webhook_condominio (condominio_id),
  UNIQUE KEY uk_financeiro_webhook_hash (hash_idempotencia),
  CONSTRAINT fk_financeiro_webhook_condominio
    FOREIGN KEY (condominio_id) REFERENCES condominios(id) ON DELETE SET NULL,
  CONSTRAINT fk_financeiro_webhook_gateway_conta
    FOREIGN KEY (gateway_conta_id) REFERENCES financeiro_gateway_contas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Observacao de nomenclatura

Nesta proposta, a coluna foi nomeada como `ambiente_gateway` para evitar ambiguidade com:

- `ambiente_financeiro` do responsavel financeiro da unidade
- ambientes internos do `EzView`, que devem permanecer nomeados como `teste` e `producao`

## Tabela proposta - `financeiro_notificacoes`

### Finalidade

Rastrear o envio operacional de cobrancas pela plataforma.

### Estrutura proposta

```sql
CREATE TABLE financeiro_notificacoes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  cobranca_id CHAR(36) NOT NULL,
  condominio_id CHAR(36) NOT NULL,
  responsavel_financeiro_id CHAR(36) NULL,
  canal ENUM('inbox','email','gateway') NOT NULL,
  status_envio ENUM('pendente','enviado','entregue','falhou') NOT NULL DEFAULT 'pendente',
  referencia_externa VARCHAR(120) NULL,
  detalhe_envio TEXT NULL,
  enviado_em DATETIME NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_financeiro_notificacao_cobranca (cobranca_id),
  KEY idx_financeiro_notificacao_condominio (condominio_id),
  KEY idx_financeiro_notificacao_responsavel (responsavel_financeiro_id),
  KEY idx_financeiro_notificacao_canal_status (canal, status_envio),
  CONSTRAINT fk_financeiro_notificacao_cobranca
    FOREIGN KEY (cobranca_id) REFERENCES financeiro_cobrancas(id) ON DELETE CASCADE,
  CONSTRAINT fk_financeiro_notificacao_condominio
    FOREIGN KEY (condominio_id) REFERENCES condominios(id) ON DELETE CASCADE,
  CONSTRAINT fk_financeiro_notificacao_responsavel
    FOREIGN KEY (responsavel_financeiro_id) REFERENCES unidades_responsaveis_financeiros(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Constraints sugeridas no nivel do banco

### Constraint 1 - unicidade de cobranca do gateway

Evitar duplicidade da mesma cobranca externa:

```sql
UNIQUE (gateway, gateway_charge_id)
```

### Constraint 2 - referencia de segunda via

Permitir auto-relacao segura:

```sql
FOREIGN KEY (segunda_via_de_cobranca_id) REFERENCES financeiro_cobrancas(id)
```

### Constraint 3 - tamanho de `uf`

```sql
CHECK (CHAR_LENGTH(uf) = 2)
```

### Constraint 4 - bloquear deletes que destruam historico critico

Para `usuario_id` e `responsavel_financeiro_id` em cobrancas historicas, a recomendacao e:

- `ON DELETE RESTRICT` ou preservacao por inativacao logica

### Constraint 5 - `payload_json` obrigatorio em webhook

Todo webhook recebido deve existir como registro bruto persistido.

## Observacoes de integridade no nivel do banco

### 1. O banco protege referencia, nao toda a regra de negocio

Algumas regras importantes nao sao ideais para depender apenas de constraint SQL.

Exemplos:

- apenas um responsavel financeiro ativo por unidade
- apenas um responsavel financeiro ativo por usuario na mesma unidade
- elegibilidade para producao

Essas regras devem ser protegidas por:

- indices de apoio
- validacoes no backend
- servicos transacionais

### 2. Historico nao deve ser apagado fisicamente

Responsavel financeiro trocado:

- deve ser encerrado
- nao deletado

Cobranca emitida:

- deve permanecer apontando para o responsavel da epoca

### 3. Atomicidade local

No banco, a emissao local deve ocorrer dentro de transacao quando envolver:

- criacao/atualizacao de `financeiro_cobrancas`
- vinculacao de `responsavel_financeiro_id`
- escrita em `financeiro_eventos`
- escrita em eventual tabela de tentativa operacional

### 4. Atomicidade externa nao existe

Criar cobranca no gateway nao participa da mesma transacao do MySQL.

Entao a protecao correta e:

- status intermediarios
- retry controlado
- reconciliacao por webhook
- idempotencia por `gateway_charge_id` e `hash_idempotencia`

### 5. Redundancia controlada e aceitavel

Manter em `financeiro_cobrancas`:

- `usuario_id`
- `unidade_id`
- `condominio_id`

mesmo tendo `responsavel_financeiro_id`, e aceitavel porque:

- melhora performance de leitura
- preserva compatibilidade com telas e filtros
- reduz joins em listagens administrativas

Desde que a fonte oficial da responsabilidade continue sendo:

- `responsavel_financeiro_id`

## Sequencia recomendada para futura migracao real

1. criar `financeiro_gateway_contas`
2. criar `unidades_responsaveis_financeiros`
3. ampliar `financeiro_cobrancas`
4. criar `financeiro_webhook_logs`
5. criar `financeiro_notificacoes`
6. revisar indices e constraints
7. adaptar o backend em ambiente local e sandbox

## Proximo passo recomendado

Depois desta proposta fisica:

- revisar nomenclaturas finais
- decidir quais campos ficam duplicados em `usuarios`
- e so depois desenhar a migracao oficial do banco
