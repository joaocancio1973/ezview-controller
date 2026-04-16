# Prestadores de Servico

## Dominio

Responsavel pelo cadastro recorrente de prestadores que ja atenderam ou atendem o condominio com frequencia suficiente para justificar memoria operacional da portaria.

## Estrutura fisica recomendada

Tabela principal sugerida:
- `prestadores_servico`

Campos centrais:
- `condominio_id`
- `nome_prestador`
- `documento`
- `empresa`
- `telefone`
- `telefone_secundario`
- `whatsapp`
- `email`
- `placa`
- `veiculo_descricao`
- `responsavel_nome`
- `categoria_servico`
- `observacoes`
- `contato_utilitario`
- `atende_24h`
- `status`
- `ultimo_acesso_em`
- `cadastrado_por_usuario_id`

Evolucao sugerida em acessos:
- `prestador_servico_id` opcional em `acessos_autorizacoes`

## Endpoints recomendados para fase 1

Status atual da fase:

- tabela fisica criada
- CRUD administrativo implementado
- lista de contatos utilitarios implementada
- sugestoes da portaria implementadas
- historico por prestador implementado
- cadastro rapido pela portaria implementado
- integracao com `Acessos` via `prestador_servico_id` implementada

### GET /prestadores-servico

#### Permissao

- `admin`
- `funcionario`

#### Regra

- lista prestadores do condominio no escopo correto
- aceita filtros por categoria, status, nome, empresa e placa

### POST /prestadores-servico

#### Permissao

- `admin`
- `funcionario` da `portaria`

#### Regra

- cria novo prestador recorrente no condominio
- categoria de servico e obrigatoria
- a portaria pode usar este endpoint em cadastro rapido durante atendimento local

### PATCH /prestadores-servico/:id

#### Permissao

- `admin`

#### Regra

- atualiza dados cadastrais sem apagar historico anterior

### PATCH /prestadores-servico/:id/status

#### Permissao

- `admin`

#### Regra

- alterna entre `ativo`, `inativo` e `bloqueado`
- nunca remove historico operacional anterior

### GET /prestadores-servico/:id/historico

#### Permissao

- `admin`
- `funcionario`

#### Regra

- retorna resumo de acessos, abertos, finalizados e negados
- entrega os ultimos registros operacionais vinculados ao prestador

### GET /prestadores-servico/sugestoes

#### Permissao

- `admin`
- `morador`
- `funcionario`

#### Regra

- retorna sugestoes rapidas por nome, empresa, placa e categoria
- pensado para uso no modal da portaria e em futuras selecoes assistidas

## Integracao recomendada com Acessos

- a portaria pode escolher um prestador recorrente ao registrar entrada ou autorizacao
- quando um prestador recorrente for selecionado, os dados base devem preencher automaticamente o formulario
- o sistema deve atualizar `ultimo_acesso_em` ao concluir nova passagem operacional relevante

### GET /prestadores-servico/contatos

#### Permissao

- `admin`
- `morador`

#### Regra

- retorna apenas prestadores marcados como contato utilitario
- aceita filtros por categoria e atendimento 24h
- pensado como lista 102/apoio operacional do condominio
