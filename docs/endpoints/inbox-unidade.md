# Endpoints - InBox da Unidade

## Objetivo

Documentar o cadastro de pessoas recorrentes da unidade e sua integracao com `Acessos`.

## Endpoints

### `GET /inbox-unidade`

Lista o inBox no contexto do usuario.

Permissao:
- `morador`
- `admin`

Regras:
- `morador` enxerga apenas a propria unidade como `titular`
- `admin` pode filtrar por `condominio_id` e `unidade_id`

### `GET /inbox-unidade/sugestoes`

Retorna sugestoes leves para uso em `Acessos`.

Permissao:
- `morador`
- `admin`
- `funcionario`

Filtros aceitos:
- `termo`
- `unidade_id`
- `apenas_ativos`

### `POST /inbox-unidade`

Cria uma pessoa recorrente no inBox da unidade.

Permissao:
- `morador`
- `admin`

Payload esperado:

```json
{
  "nome_completo": "Carlos Oliveira",
  "documento": "123456789",
  "telefone": "71999999999",
  "parentesco_relacao": "Primo",
  "observacoes": "Pode entrar para visitas frequentes",
  "foto_identificacao_url": "/uploads/perfis/carlos.jpg"
}
```

Regras:
- limite de `10` pessoas ativas por unidade
- somente o `titular` pode gerir o proprio inBox

### `PATCH /inbox-unidade/:id`

Atualiza dados da pessoa recorrente.

### `PATCH /inbox-unidade/:id/status`

Atualiza status para:
- `ativo`
- `inativo`
- `bloqueado`

## Integracao em Acessos

`POST /acessos/autorizacoes` agora aceita:

```json
{
  "inbox_visitante_id": "uuid"
}
```

Comportamento:
- reaproveita nome e documento
- atualiza `ultimo_acesso_em`
- se estiver `bloqueado`, exige liberacao manual
