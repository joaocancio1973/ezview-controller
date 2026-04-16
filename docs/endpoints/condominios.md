# Condominios

## GET /condominios

### Permissao

- `admin`

### Regra

- retorna apenas os condominios vinculados ao usuario admin logado
- a listagem devolve o `cnpj` em formato numerico padronizado, sem mascara

## POST /condominios

### Permissao

- `admin`

### Regra

- cria condominio vinculado ao usuario logado em `condominios.admin_id`
- respeita o limite de condominios definido em `admins.limite_condominios`
- normaliza o `cnpj` antes de persistir no banco
- valida o `cnpj` antes da gravacao
- bloqueia duplicidade por comparacao numerica do `cnpj`, mesmo que exista dado legado salvo com mascara

### Campos principais

- `cnpj`
- `razao_social`
- `nome_fantasia`
- `tipo`
- `cep`
- `endereco`
- `numero`
- `complemento`
- `bairro`
- `cidade`
- `estado`

## Integracao de frontend

- o modal de criacao consulta `ViaCEP` pelo `CEP`
- o preenchimento automatico ocorre para `endereco`, `bairro`, `cidade` e `estado`
- os campos continuam editaveis para ajuste manual apos a consulta
