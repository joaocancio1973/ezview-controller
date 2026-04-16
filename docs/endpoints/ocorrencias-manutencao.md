# Ocorrencias e Manutencao

## Dominio

Responsavel por abertura, triagem, atendimento e conclusao de ocorrencias e demandas de manutencao dentro do condominio.

## Estrutura fisica recomendada

Tabelas principais sugeridas:

- `ocorrencias`
- `ocorrencias_eventos`

## Status atual da fase

- banco fisico criado
- backend implementado
- visao inicial de `morador`, `funcionario` e `admin` plugada na SPA
- trilha de historico por ocorrencia implementada

## Endpoints da fase atual

### GET /ocorrencias

#### Permissao

- `admin`
- `morador`
- `funcionario`

#### Regra

- lista ocorrencias no escopo correto
- aceita filtros por categoria, status, prioridade, periodo e unidade

### POST /ocorrencias

#### Permissao

- `admin`
- `morador`
- `funcionario`

#### Regra

- abre nova ocorrencia
- registra origem e contexto do usuario logado
- permite contexto sem unidade quando aplicavel

### PATCH /ocorrencias/:id

#### Permissao

- `admin`
- `funcionario`

#### Regra

- atualiza dados operacionais da ocorrencia
- gera evento de trilha

### PATCH /ocorrencias/:id/status

#### Permissao

- `admin`
- `funcionario`

#### Regra

- altera status entre `aberta`, `em_analise`, `em_atendimento`, `concluida`, `cancelada`
- gera evento operacional na trilha

### PATCH /ocorrencias/:id/responsavel

#### Permissao

- `admin`

#### Regra

- atribui ou troca funcionario responsavel
- gera evento de encaminhamento

### GET /ocorrencias/:id/historico

#### Permissao

- `admin`
- `morador`
- `funcionario`

#### Regra

- retorna resumo da ocorrencia e trilha de eventos
- morador so acessa itens do proprio contexto

## Integracao recomendada com Funcionarios

- `limpeza` recebe ocorrencias ligadas a limpeza e areas comuns
- `manutencao` recebe demandas tecnicas
- `administrativo` pode atuar em ocorrencias burocraticas e de supervisao

## Integracao recomendada com Moradores

- morador abre ocorrencias da propria unidade ou do condominio
- morador acompanha status e devolutiva
- historico do proprio pedido deve permanecer visivel

## Anexos leves na fase atual

- POST /ocorrencias aceita nexos com ate 3 fotos em formato leve
- GET /ocorrencias/:id/historico retorna tambem a lista de anexos vinculados

