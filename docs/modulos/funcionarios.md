# Modulo: Funcionarios

## Objetivo

Definir como o `admin` cadastra, ativa e gerencia os profissionais operacionais de um condominio, com foco em portaria, guarita, supervisao e trilha de auditoria.

## Problema que resolve

O sistema ja possui `usuarios`, mas ainda nao possui um dominio proprio para o colaborador do condominio. O modulo `Funcionarios` resolve isso ao separar:

- identidade da pessoa em `usuarios`
- vinculo funcional em um unico `condominio`
- area de atuacao, cargo, matricula e status operacional
- ativacao segura de conta e trilha de historico
- sessoes operacionais para sustentar fila e rodizio de portaria

## Regra estrutural central

- cada `funcionario` pertence a um unico condominio por vez
- o funcionario nao pertence ao grupo inteiro de condominios do `admin`
- o acesso operacional do funcionario e sempre restrito ao condominio do seu vinculo
- o cartao digital do funcionario tambem pertence a esse unico condominio

## Atores envolvidos

### Admin

- cria o funcionario
- vincula o funcionario a um condominio especifico
- acompanha ativacao, cargo e status
- gerencia admissao, desligamento e historico funcional

### Funcionario

- ativa a propria conta por convite
- faz login direto na tela operacional do seu condominio
- acessa apenas os menus pertinentes ao seu trabalho
- registra operacoes de portaria, acesso, validacao e ocorrencias

## Tabelas envolvidas

### Ja existentes

- `usuarios`
- `condominios`
- `convites_ativacao`

### Novas recomendadas

- `funcionarios`
- `funcionarios_sessoes`

## Modelagem inicial sugerida

### funcionarios

- `id`
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
- `criado_em`
- `atualizado_em`

### funcionarios_sessoes

- `id`
- `funcionario_id`
- `condominio_id`
- `status`
- `origem`
- `iniciado_em`
- `ultimo_ping_em`
- `encerrado_em`
- `criado_em`
- `atualizado_em`

## Estrutura fisica recomendada

### funcionarios

- `id char(36)` PK
- `usuario_id char(36)` FK para `usuarios.id`
- `condominio_id char(36)` FK para `condominios.id`
- `area_atuacao enum('portaria','limpeza','manutencao','administrativo','outro')`
- `cargo varchar(80)`
- `matricula varchar(50)`
- `foto_identificacao_url varchar(255)` opcional
- `status enum('ativo','inativo','afastado','desligado')`
- `cartao_token_hash varchar(255)` opcional
- `cartao_ativo tinyint(1)`
- `admitido_em datetime` opcional
- `desligado_em datetime` opcional
- `criado_por char(36)` FK para `usuarios.id`
- `atualizado_por char(36)` FK para `usuarios.id`
- `criado_em timestamp`
- `atualizado_em timestamp`

### funcionarios_sessoes

- `id char(36)` PK
- `funcionario_id char(36)` FK para `funcionarios.id`
- `condominio_id char(36)` FK para `condominios.id`
- `status enum('ativa','encerrada','expirada')`
- `origem enum('web','tablet','mobile','outro')`
- `iniciado_em datetime`
- `ultimo_ping_em datetime`
- `encerrado_em datetime` opcional
- `criado_em timestamp`
- `atualizado_em timestamp`

### Constraints recomendadas

- `usuario_id` unico em `funcionarios`
- `matricula` unica por `condominio_id`
- `desligado_em` so faz sentido quando `status = desligado`
- o funcionario pode ser inativado ou desligado sem exclusao fisica
- `foto_identificacao_url` deve guardar o retrato usado para identificacao operacional
- sessoes ativas de porteiros sao a base do rodizio de solicitacoes da portaria

## Regras de negocio

- `usuario_id` deve ser unico em `funcionarios`
- `matricula` deve ser unica dentro do mesmo condominio
- um funcionario ativo nao pode estar vinculado a dois condominios ao mesmo tempo
- o funcionario nasce por convite seguro e define a propria senha
- o historico funcional nao deve ser apagado fisicamente
- desligamento deve preservar trilha de atuacao
- alteracoes de cargo e status devem manter contexto de auditoria
- a foto de identificacao do funcionario deve permanecer vinculada ao historico funcional enquanto o registro existir
- `area_atuacao` deve distinguir eixos como `portaria`, `limpeza`, `manutencao` e `administrativo`
- a distribuicao automatica da portaria so considera `funcionarios` de `area_atuacao = portaria` com sessao ativa

## Fluxo funcional recomendado

### Bloco 1 - Criacao pelo admin

1. selecionar condominio
2. informar nome, email e telefone
3. informar area de atuacao, cargo e matricula
4. opcionalmente anexar foto de identificacao
5. criar conta com perfil `funcionario`
6. criar vinculo funcional com o condominio

### Bloco 2 - Convite e ativacao

1. gerar convite seguro
2. enviar link de ativacao
3. funcionario confirma dados e define senha
4. login passa a cair diretamente na rotina operacional

### Bloco 3 - Sessoes operacionais

1. funcionario de portaria faz login
2. sistema registra sessao ativa
3. ordem de login passa a compor o rodizio de distribuicao
4. logout ou expiracao encerram a sessao operacional
5. encerramento da sessao nao apaga nem remove a fila do condominio
6. a troca de turno deve preservar rastreabilidade entre quem recebeu, quem assumiu e quem executou cada evento

## Regras adicionais de turno

- login do porteiro funciona como marcador operacional de entrada no posto
- logout funciona como marcador de encerramento do turno ativo na aplicacao
- sessoes abandonadas devem poder expirar por timeout de `ping` sem perder historico
- a fila remanescente deve continuar disponivel para o proximo porteiro do mesmo condominio
- supervisao futura deve permitir ver quem estava logado em cada horario de operacao

### Bloco 4 - Ciclo de vida funcional

1. acompanhar status
2. registrar admissao
3. registrar desligamento
4. manter historico sem exclusao destrutiva

## Menus esperados para o funcionario

- painel operacional
- controle de acesso
- fila da portaria
- historico do turno
- ocorrencias e manutencao

## Ordem recomendada de implementacao

1. modelagem fisica de `funcionarios`
2. fluxo de convite e ativacao
3. tela administrativa de cadastro
4. dashboard inicial do funcionario
5. sessoes operacionais do funcionario
6. integracao com controle de acesso

## Observacoes

- `sub-sindico` deve ser tratado depois como papel proprio, nao misturado com `funcionario`
- o modulo de `Funcionarios` deve nascer antes da tela completa de portaria
