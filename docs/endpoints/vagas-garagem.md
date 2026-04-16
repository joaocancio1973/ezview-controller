# Endpoints - Vagas de Garagem

## Objetivo

Documentar o dominio de vagas de garagem do condominio.

## Endpoints implementados - operacao inicial

### `GET /vagas-garagem`

Lista vagas de garagem no escopo do `admin`.

Filtros suportados:

- `condominio_id`
- `unidade_id`

Permissao:

- `admin`

### `POST /vagas-garagem`

Cria uma vaga de garagem com vinculo opcional a uma unidade.

Permissao:

- `admin`

Payload esperado:

```json
{
  "condominio_id": "uuid",
  "unidade_id": "uuid-ou-null",
  "identificacao": "G1-12",
  "tipo": "carro",
  "coberta": true,
  "ativa": true
}
```
