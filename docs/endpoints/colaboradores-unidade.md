# Colaboradores da Unidade

## Dominio

Responsavel pelo cadastro recorrente de pessoas que trabalham diretamente para uma unidade e precisam de identificacao operacional distinta de visitante eventual.

## Estrutura fisica atual

Tabela principal:
- `colaboradores_unidade`

Integracao opcional imediata em `acessos_autorizacoes`:
- `colaborador_unidade_id`

## Endpoints implementados na fase 1

### GET /colaboradores-unidade

#### Permissao

- `admin`
- `morador`

#### Regra

- `admin` lista colaboradores do proprio escopo condominial
- `morador` lista apenas colaboradores da propria unidade
- aceita filtros por `condominio_id`, `unidade_id`, `funcao` e `status` no contexto do `admin`

### POST /colaboradores-unidade

#### Permissao

- `admin`
- `morador`

#### Regra

- cria cadastro recorrente do colaborador vinculado a unidade
- aceita funcao, documento, telefone, empresa, observacoes e foto
- `pode_autorizar_terceiros` nasce `false`
- para `morador`, o backend deriva automaticamente `condominio_id` e `unidade_id`

### PATCH /colaboradores-unidade/:id

#### Permissao

- `admin`
- `morador` no proprio contexto

#### Regra

- atualiza os dados cadastrais do colaborador
- nesta fase, o vinculo de condominio e unidade nao muda pela edicao
- preserva historico operacional

### PATCH /colaboradores-unidade/:id/status

#### Permissao

- `admin`
- `morador` no proprio contexto

#### Regra

- altera entre `ativo`, `inativo` e `bloqueado`
- nao apaga historico do colaborador

## Integracao ja disponivel

- `POST /acessos/autorizacoes` aceita `colaborador_unidade_id` como atalho recorrente
- ao informar `colaborador_unidade_id`, o backend valida escopo, status e reaproveita nome, documento, empresa e funcao do colaborador

## Evolucao planejada

- credencial restrita do colaborador so deve funcionar apos entrada validada no condominio
- QR Code de identificacao do colaborador e caminho recomendado para a proxima fase
- a futura sessao operacional do colaborador deve ser encerrada no registro de saida

## Endpoints previstos para fase 2

- `PATCH /colaboradores-unidade/:id/permissoes`
- `GET /colaboradores-unidade/:id/historico`
- `POST /acessos/autorizacoes` com `colaborador_unidade_id` como atalho recorrente

