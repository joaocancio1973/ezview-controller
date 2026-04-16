# Reservas

## GET /reservas

### Permissao

- `admin`
- `morador` em leitura controlada

### Regra

- para `admin`, retorna as reservas vinculadas ao contexto do usuario autenticado
- para `morador`, retorna apenas as reservas do proprio usuario no contexto da sua unidade ativa
- permite leitura por condominio, area, unidade e periodo no contexto administrativo
- ja retorna indicacao de `dia_inteiro`, `data_limite_confirmacao`, `status_pagamento` e `confirmado_em` quando aplicavel

### Query params

- `condominio_id` opcional
- `area_id` opcional
- `unidade_id` opcional
- `data_inicio` opcional
- `data_fim` opcional

## POST /reservas

### Permissao

- `admin`
- `morador` no proprio contexto

### Regra

- cria uma reserva vinculada a uma area comum
- valida se a area pertence ao mesmo condominio do contexto
- valida conflito de horario antes de salvar
- suporta reserva com horario ou reserva de `dia_inteiro`
- quando a area exige taxa, calcula `data_limite_confirmacao` em ate 7 dias antes do evento
- quando a area exige taxa, a reserva nasce com `status_pagamento = pendente`
- para `admin`, o responsavel padrao pode ser o proprio usuario logado
- para `morador`, `usuario_id` e `unidade_id` sao derivados do proprio vinculo ativo
- na fase atual do morador, a solicitacao nasce sempre em `pendente`

### Campos principais

- `area_id`
- `unidade_id`
- `usuario_id`
- `data_inicio`
- `data_fim`
- `dia_inteiro`
- `status`

## PATCH /reservas/:id/status

### Permissao

- `admin`

### Regra

- atualiza o `status` operacional da reserva
- permite ao admin confirmar ou cancelar a reserva
- quando houver taxa, exige `status_pagamento` em `pago` ou `isento` antes da confirmacao
- registra `confirmado_em` e `confirmado_por` ao confirmar

### Campos principais

- `status`
- `status_pagamento` opcional
- `observacao_pagamento` opcional

## GET /reservas/agenda

### Permissao

- `admin`
- `morador` em leitura derivada do proprio contexto

### Regra

- retorna uma visao agregada das reservas por area e periodo
- serve como base para a agenda operacional da interface

### Query params

- `condominio_id` opcional
- `area_id` opcional
- `data_inicio` opcional
- `data_fim` opcional

## Estado atual

- `GET /reservas` implementado para `admin`
- `GET /reservas` implementado para `morador` em leitura controlada
- `POST /reservas` implementado para `admin`
- `POST /reservas` implementado para `morador` no proprio contexto
- `PATCH /reservas/:id/status` implementado
- `GET /reservas/agenda` implementado

## Estrutura fisica atual da tabela reservas

- `status`: `pendente`, `confirmada`, `cancelada`
- `status_pagamento`: `nao_aplicavel`, `pendente`, `pago`, `isento`, `rejeitado`
- `observacao_pagamento`
- `confirmado_em`
- `confirmado_por`
