# Torres

## GET /torres

### Permissao

- `admin`

### Regra

- retorna as torres vinculadas aos condominios do admin logado
- devolve `andar_inicial`, `quantidade_andares` e `andar_final`

### Observacoes

- a listagem atual aceita filtro por `condominio_id`

## POST /torres

### Permissao

- `admin`

### Regra

- cria uma torre vinculada a um condominio do admin logado
- valida se o condominio pertence ao admin autenticado
- bloqueia duplicidade de nome dentro do mesmo condominio
- exige a definicao da faixa vertical da torre

### Campos principais

- `condominio_id`
- `nome`
- `descricao`
- `andar_inicial`
- `quantidade_andares`
- `ativo`

## Regra derivada

- `andar_final = andar_inicial + quantidade_andares - 1`

## Possiveis proximos endpoints

- `GET /torres/:id`
- `PUT /torres/:id`
- `PATCH /torres/:id/status`
