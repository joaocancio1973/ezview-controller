# Unidades

## GET /unidades

### Permissao

- `admin`

### Regra

- retorna as unidades vinculadas aos condominios do admin logado
- permite leitura por condominio e, quando aplicavel, por torre

### Query params

- `condominio_id` opcional
- `torre_id` opcional

## POST /unidades

### Permissao

- `admin`

### Regra

- cria uma unidade vinculada a um condominio do admin logado
- aceita `torre_id` opcional
- valida se o condominio pertence ao admin autenticado
- valida se a torre pertence ao mesmo condominio quando informada
- bloqueia duplicidade conforme a regra fisica definida
- quando o condominio possui torres e o tipo e `apartamento`, exige `torre_id`

### Campos principais

- `condominio_id`
- `torre_id`
- `tipo`
- `identificacao`
- `andar`
- `vaga`
- `ativo`

## POST /unidades/gerar-por-torre

### Permissao

- `admin`

### Regra

- gera unidades em lote a partir de uma torre do admin logado
- respeita a faixa estrutural da torre
- nao sobrescreve unidades ja existentes
- bloqueia a operacao se a faixa proposta conflitar com identificacoes existentes

### Campos principais

- `condominio_id`
- `torre_id`
- `tipo`
- `andar_inicio`
- `andar_fim`
- `unidades_por_andar`
- `sequencial_inicial`
- `ativo`

### Exemplo conceitual

Payload:

- torre entre andares `1` e `10`
- `4` unidades por andar
- `sequencial_inicial = 1`

Resultado esperado:

- `101` a `104`
- `201` a `204`
- ...
- `1001` a `1004`

### Resposta resumida

- torre utilizada
- configuracao aplicada
- total de unidades criadas
- preview da primeira e da ultima identificacao

## Regra de unicidade recomendada

- com torre: `torre_id + identificacao`
- sem torre: `condominio_id + identificacao`

## Possiveis proximos endpoints

- `GET /unidades/:id`
- `PUT /unidades/:id`
- `PATCH /unidades/:id/status`
