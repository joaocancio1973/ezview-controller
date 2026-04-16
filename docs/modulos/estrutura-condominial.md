# Modulo: Estrutura Condominial

## Objetivo

Modelar a estrutura real de funcionamento do condominio antes da camada operacional do SaaS.

Esse modulo e a base para:

- moradores
- dependentes
- titulares
- visitantes
- prestadores de servico
- reservas
- alertas
- rotinas internas do condominio

## Escopo inicial

- `torres`
- `unidades`
- `unidade_usuarios`

Leituras recomendadas:

- [Torres](torres.md)
- [Unidades](unidades.md)

## Tabelas relacionadas

- `condominios`
- `torres`
- `unidades`
- `usuarios`
- `unidade_usuarios`

## Principios de modelagem

### Separar identidade de ocupacao

- a pessoa nasce em `usuarios`
- o vinculo da pessoa com a unidade nasce em `unidade_usuarios`

Isso evita:

- duplicidade de pessoas
- perda de historico
- acoplamento incorreto entre usuario e unidade

### Estrutura fisica primeiro

Antes de modelar a rotina do condominio, e preciso definir:

- torre
- unidade
- ocupacao da unidade

## Regras recomendadas

### Torres

- cada torre pertence a um condominio
- o nome da torre deve ser unico por condominio

### Unidades

- cada unidade pertence a um condominio
- a unidade pode ter `torre_id` nulo
- a identificacao da unidade deve ser unica no contexto fisico correto

Regra desejada:

- com torre: `torre_id + identificacao`
- sem torre: `condominio_id + identificacao`

### Usuario vinculado a unidade

- a mesma pessoa nao pode ser vinculada duas vezes a mesma unidade
- a regra atual de banco `uk_unidade_usuario (unidade_id, usuario_id)` esta correta

### Papel por unidade

Papeis atuais:

- `proprietario`
- `titular`
- `dependente`

Regras sugeridas:

- permitir varios `proprietarios`
- permitir apenas um `titular` ativo por unidade
- permitir varios `dependentes`

## Fluxo recomendado de cadastro

### Fluxo de torre

1. selecionar condominio
2. informar nome da torre
3. validar unicidade no condominio
4. criar torre

### Fluxo de unidade

1. selecionar condominio
2. selecionar torre quando aplicavel
3. informar tipo
4. informar identificacao
5. validar unicidade no contexto correto
6. criar unidade

### Fluxo de morador principal

1. localizar usuario existente ou cadastrar novo usuario
2. selecionar unidade
3. vincular como `titular`
4. validar se ja existe `titular` ativo

### Fluxo de dependentes

1. localizar usuario existente ou cadastrar novo usuario
2. selecionar unidade
3. vincular como `dependente`
4. impedir duplicidade do mesmo usuario na mesma unidade

## Risco tecnico atual

A tabela `unidades` possui tres regras de unicidade ao mesmo tempo:

- `uk_unidade_condominio`
- `uk_unidade_torre`
- `uk_unidade_logica`

Isso precisa de revisao antes do CRUD definitivo.

## Recomendacao de implementacao

Ordem sugerida:

1. revisar regra de unicidade de `unidades`
2. implementar CRUD de `torres`
3. implementar CRUD de `unidades`
4. implementar vinculo `unidade_usuarios`
5. implementar regra de `titular` unico por unidade

## Resultado esperado

Ao final desse modulo, o sistema deve conseguir:

- representar torres e unidades reais
- cadastrar moradores principais
- vincular dependentes
- evitar duplicidade de unidade e de ocupacao
- preparar a base para os proximos modulos operacionais do condominio
