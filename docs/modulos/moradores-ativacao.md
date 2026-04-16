# Modulo: Moradores e Ativacao

## Objetivo

Definir o fluxo seguro de cadastro de moradores pelo `admin`, ativacao por convite e evolucao futura para dependentes e veiculos.

## Regra central

- todo morador e um `usuario`
- o `admin` cria o morador no contexto de uma unidade
- a pessoa nao nasce com login livre; ela ativa a conta por convite
- o titular ativado deve poder evoluir depois para dependentes e veiculos

## Tabelas envolvidas

### Ja existentes

- `usuarios`
- `unidade_usuarios`
- `unidades`
- `condominios`

### Nova ja criada

- `convites_ativacao`

## Estrutura fisica atual de convites_ativacao

A tabela de convites passou a ser generica para `morador` e `funcionario`.

Campos principais:
- `tipo_convite`
- `usuario_id`
- `condominio_id`
- `unidade_id` opcional para fluxo de morador
- `funcionario_id` opcional para fluxo de funcionario
- `email_destino`
- `token_hash`
- `status`
- `expira_em`
- `enviado_em`
- `aceito_em`
- `criado_por`

Regra:
- convite de morador segue com `tipo_convite = morador`
- convite de funcionario segue com `tipo_convite = funcionario`
- o sistema continua salvando apenas o hash do token, nunca o token bruto

## Tabelas futuras recomendadas

- `veiculos`
- expansoes futuras para dependentes, se necessarias

## Fluxo fase 1

### Admin

1. seleciona unidade
2. informa nome, email e telefone
3. define o papel do vinculo (`titular`, `proprietario`, `dependente`)
4. cria ou reutiliza o `usuario`
5. gera convite de ativacao

### Morador convidado

1. recebe o link de ativacao
2. abre a pagina publica de ativacao
3. visualiza o condominio, unidade e papel
4. define sua senha
5. ativa a conta

## Regras de seguranca

- token com expiracao curta (`48h`)
- token de uso unico
- senha nunca enviada por email
- duplicidade por email deve ser tratada antes da criacao
- 1 `titular` ativo por unidade
- o morador nao altera sozinho o vinculo de unidade no fluxo de ativacao

## Endpoints da fase atual

### Admin

- `GET /moradores`
- `POST /moradores`
- `POST /moradores/:id/enviar-convite`

### Titular / unidade

- `GET /moradores/me/residentes`
- `POST /moradores/me/residentes`
- `POST /moradores/me/residentes/:id/enviar-convite`

### Convites

- `GET /convites/validar?token=...`
- `POST /convites/ativar`

## Evolucao atual

- o titular ativo ja pode agregar residentes da propria unidade
- o residente nasce com convite de ativacao
- foto e documento passam a preparar a base do card digital
- a unidade continua sendo o contexto central do vinculo

## Ordem recomendada de implementacao

1. criar morador principal
2. ativar conta por link seguro
3. abrir area do morador
4. permitir ao titular agregar residentes
5. depois evoluir para veiculos
6. depois evoluir para inbox de liberacoes recorrentes

