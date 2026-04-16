# Modulo: InBox da Unidade

## Objetivo

Criar uma lista curta de pessoas recorrentes da unidade, com check-in mais livre na portaria, sem perder bloqueio, historico e auditoria.

## Regra central

- o `inBox` pertence a uma `unidade`
- o `titular` da unidade gerencia essa lista
- a lista deve ser curta e operacional
- o limite atual e de `10` pessoas por unidade
- pessoas com status `bloqueado` nao entram por fluxo livre; exigem liberacao manual

## Tabela fisica

- `inbox_visitantes_unidade`
- integracao em `acessos_autorizacoes.inbox_visitante_id`

Campos principais:
- `condominio_id`
- `unidade_id`
- `nome_completo`
- `documento`
- `telefone`
- `parentesco_relacao`
- `observacoes`
- `status`
- `foto_identificacao_url`
- `ultimo_acesso_em`
- `cadastrado_por_usuario_id`

## Status

- `ativo`
- `inativo`
- `bloqueado`

## Fluxo do morador

1. o titular abre `InBox`
2. cadastra pessoas de confianca
3. informa nome, documento, telefone e relacao
4. opcionalmente informa foto e observacoes
5. a pessoa passa a ficar disponivel para check-in mais livre na portaria

## Fluxo da portaria

1. a pessoa chega sem solicitacao nova
2. o porteiro busca no `InBox`
3. se estiver `ativo`, o sistema reaproveita dados e registra a entrada
4. se estiver `bloqueado`, o sistema sinaliza que precisa de liberacao manual

## Integracao com Acessos

- o morador pode selecionar uma pessoa do `InBox` no modal de liberacao
- a portaria pode localizar pessoas do `InBox` no atendimento local
- a autorizacao guarda `inbox_visitante_id`
- `ultimo_acesso_em` e atualizado quando o fluxo e usado

## Leitura de produto

O `InBox` funciona como uma pequena agenda recorrente da unidade:
- primos
- tios
- amigos proximos
- pessoas que costumam visitar a unidade

Nao substitui colaborador, prestador ou visitante eventual.
