# Funcionarios

## Dominio

Responsavel pelo cadastro, ativacao e ciclo de vida do colaborador de um unico condominio.

## Estrutura fisica prevista

Tabela: `funcionarios`

Campos principais:
- `usuario_id`
- `condominio_id`
- `area_atuacao`
- `cargo`
- `matricula`
- `foto_identificacao_url`
- `status`
- `cartao_token_hash`
- `cartao_ativo`
- `admitido_em`
- `desligado_em`
- `criado_por`
- `atualizado_por`

Regras estruturais:
- `usuario_id` unico em `funcionarios`
- `matricula` unica por `condominio`
- funcionario pertence a um unico condominio por vez
- foto de identificacao integra o cadastro operacional do funcionario
- `area_atuacao` padroniza o eixo principal do trabalho interno

## Endpoints fase 1 implementados

### GET /funcionarios

#### Permissao

- `admin`

#### Regra

- lista apenas funcionarios do condominio administrado no contexto do admin logado
- aceita filtros por `condominio_id`, `area_atuacao` e `status`

### POST /funcionarios

#### Permissao

- `admin`

#### Regra

- cria funcionario com perfil `funcionario`
- vincula a um unico condominio
- registra `area_atuacao`, `cargo`, `matricula` e foto opcional
- inicia fluxo de convite e ativacao

### POST /funcionarios/:id/enviar-convite

#### Permissao

- `admin`

#### Regra

- reenvia convite de ativacao do funcionario

### PATCH /funcionarios/:id/status

#### Permissao

- `admin`

#### Regra

- ativa, inativa, afasta ou desliga o funcionario sem apagar historico

### GET /funcionarios/me

#### Permissao

- `funcionario`

#### Regra

- retorna o proprio cadastro funcional para montar o painel operacional do colaborador

## Endpoints previstos para fase 2

- `GET /funcionarios/:id`
- `GET /me/turno`
- `GET /me/historico-operacional`
