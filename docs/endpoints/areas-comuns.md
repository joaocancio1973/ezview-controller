# Areas Comuns

## GET /areas-comuns

### Permissao

- `admin`
- `morador` em leitura controlada

### Regra

- para `admin`, retorna as areas comuns vinculadas aos condominios do admin logado
- para `morador`, retorna apenas as areas comuns ativas do condominio vinculado a sua unidade ativa
- permite leitura por condominio no contexto administrativo

### Query params

- `condominio_id` opcional
- `exige_reserva` opcional

## POST /areas-comuns

### Permissao

- `admin`

### Regra

- cria uma area comum vinculada a um condominio do admin logado
- valida se o condominio pertence ao admin autenticado
- registra configuracoes basicas de uso, reserva e taxa

### Campos principais

- `condominio_id`
- `nome`
- `descricao`
- `exige_reserva`
- `exige_taxa`
- `valor_taxa`
- `ativo`

## Estado atual

- `GET /areas-comuns` implementado para `admin`
- `GET /areas-comuns` implementado para `morador` em leitura controlada
- `POST /areas-comuns` implementado

## Possiveis proximos endpoints

- `GET /areas-comuns/:id`
- `PUT /areas-comuns/:id`
- `PATCH /areas-comuns/:id/status`
