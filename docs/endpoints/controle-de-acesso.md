# Controle de Acesso

## Dominio

Responsavel pelas autorizacoes de entrada e saida de visitantes, prestadores e outros acessos operacionais do condominio.

## Estrutura fisica atual

Tabelas:
- `acessos_autorizacoes`
- `acessos_eventos`
- `funcionarios_sessoes`

Campos centrais de `acessos_autorizacoes`:
- `condominio_id`
- `unidade_id`
- `colaborador_unidade_id` opcional
- `solicitante_id`
- `tipo_acesso`
- `nome_visitante`
- `documento`
- `empresa`
- `servico`
- `placa`
- `inicio_previsto`
- `fim_previsto`
- `urgente`
- `status`
- `qr_token_hash`
- `qr_expira_em`
- `destinado_para_funcionario_id`
- `assumido_por_funcionario_id`
- `assumido_em`
- `criado_por`
- `validado_por`
- `validado_em`

Campos centrais de `acessos_eventos`:
- `condominio_id`
- `autorizacao_id`
- `funcionario_id`
- `tipo_evento`
- `origem`
- `observacao`

Campos centrais de `funcionarios_sessoes`:
- `funcionario_id`
- `condominio_id`
- `status`
- `origem`
- `iniciado_em`
- `ultimo_ping_em`
- `encerrado_em`

Regras estruturais:
- `qr_token_hash` unico quando existir
- historico de eventos append-only
- funcionario sempre opera dentro do proprio condominio
- rodizio de solicitacoes considera sessoes ativas de porteiros por ordem de login

## Endpoints implementados na fase 1

Observacao:
- `POST /acessos/autorizacoes` ja pode receber `colaborador_unidade_id` para reaproveitar cadastro recorrente da unidade

### GET /acessos/autorizacoes

#### Permissao

- `admin`
- `funcionario`
- `morador` em leitura restrita ao proprio contexto

#### Regra

- lista autorizacoes conforme o perfil e o escopo correto
- `morador` ve apenas as solicitacoes do proprio contexto residencial
- a UI do morador pode usar essa listagem para reenviar nova solicitacao sem apagar a anterior
- `funcionario` ve o contexto do proprio condominio

### POST /acessos/autorizacoes

#### Permissao

- `morador`
- `admin` em operacao assistida

#### Regra

- cria autorizacao de acesso vinculada a uma unidade e a um solicitante
- aceita tipo `visitante`, `prestador`, `entrega` e `outro`
- quando for `prestador`, exige tambem o campo `servico`
- aceita `urgente` para liberacao imediata com destaque operacional
- para `morador`, o backend deriva automaticamente `unidade_id` e `condominio_id`
- se houver `colaborador_unidade_id`, o backend valida escopo e reaproveita os dados recorrentes do colaborador
- se houver porteiro ativo no condominio, a solicitacao recebe `destinado_para_funcionario_id`

### GET /acessos/fila

#### Permissao

- `funcionario`

#### Regra

- retorna a fila operacional do dia para a portaria
- devolve tambem um resumo com entradas, saidas, pendentes, em andamento e urgentes
- prioriza leituras por urgencia, `assumido_por_funcionario_id`, `destinado_para_funcionario_id` e depois fila geral
- nesta fase, a fila operacional esta focada no funcionario logado

### POST /acessos/eventos

#### Permissao

- `funcionario`

#### Regra

- registra `entrada`, `saida`, `negado` ou `ajuste`
- atualiza o status da autorizacao conforme o evento
- impede entrada duplicada para a mesma autorizacao
- impede saida sem entrada valida anterior
- registra automaticamente quem assumiu e quem validou quando aplicavel

## Endpoints previstos para fase 2

- `PATCH /acessos/autorizacoes/:id/status`
- `POST /acessos/autorizacoes/:id/qrcode`
- `POST /acessos/placa/validar`
- `GET /acessos/historico`


## GET /acessos/sessoes

Retorna a visao do turno da portaria para o funcionario logado.

### Resposta

- `ativas`: sessoes ativas de portaria no condominio
- `recentes`: trocas recentes encerradas no dia

### Uso

- mostrar porteiros ativos no turno
- apoiar troca de turno
- reforcar auditoria e responsabilidade operacional

### Campos novos relevantes

- `origem_solicitacao`: `morador`, `portaria`, `admin`
- `destino_tipo`: `unidade`, `administracao`, `area_comum`, `outro`
- `destino_descricao`: texto livre do destino
- `contato_destino`: com quem vai falar
- `veiculo_descricao`: descricao curta do veiculo

### Observacao

Quando a criacao vier do porteiro, a autorizacao nasce com origem `portaria` e pode seguir sem unidade vinculada, desde que o destino esteja descrito.


## GET /acessos/autorizacoes/:id/historico

Retorna o resumo da autorizacao e a trilha de eventos operacionais.

### Permissao

- `admin`
- `funcionario`
- `morador` no proprio contexto

### Resposta

- `autorizacao`: dados principais da liberacao
- `eventos`: lista ordenada dos eventos com funcionario, sessao e horario
