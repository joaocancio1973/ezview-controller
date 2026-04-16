# Admins

## GET /admins

### Permissao

- `super_admin`

### Regra

- retorna a listagem global de admins cadastrados

## POST /admins

### Permissao

- `super_admin`

### Regra

- cria um novo admin e respectivo usuario `admin`
- respeita o limite maximo permitido pelo plano vinculado

## GET /admins/me/capacidade

### Permissao

- `admin`

### Regra

- retorna o resumo de capacidade do admin logado
- informa `limite_condominios`, `total_condominios` e `saldo_condominios`
- serve para exibir na SPA um indicativo sutil de uso do limite de condominios
