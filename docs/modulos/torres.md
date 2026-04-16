# Modulo: Torres

## Objetivo

Representar a divisao fisica do condominio quando ele possui blocos, torres ou alas.

Este modulo e a primeira camada da estrutura condominial e serve de base para:

- unidades
- moradores
- dependentes
- vagas
- reservas
- comunicacao contextualizada

## Tabelas relacionadas

- `condominios`
- `torres`
- `unidades`

## Atores

- `admin`
  - cadastra torres do proprio contexto de condominios
  - visualiza apenas torres ligadas aos condominios que administra
- `super_admin`
  - nao opera este modulo no fluxo atual da SPA
  - pode ter visao consolidada no futuro, em dashboard especifico

## Fluxos atuais

- listar torres de um condominio
- criar nova torre vinculada a um condominio do admin logado

## Regras de negocio iniciais

- toda torre pertence a um unico condominio
- o nome da torre deve ser unico dentro do mesmo condominio
- uma torre nao deve ser criada sem condominio valido
- o admin so pode criar torres nos condominios que pertencem ao seu contexto
- torres inativas devem ser preservadas para historico, mas ocultadas nas telas padrao quando aplicavel
- a torre deve informar `andar_inicial` e `quantidade_andares`
- o `andar_final` e derivado pela regra: `andar_inicial + quantidade_andares - 1`

## Principios de modelagem

- a torre organiza o endereco fisico, mas nao substitui a unidade
- a torre nao deve carregar dados de moradores
- a torre nao deve acoplar regras de visitante ou financeiro
- o modulo deve permanecer pequeno e previsivel
- condominios de casas podem futuramente operar sem torres, com foco direto em `unidades`

## Ordem de implementacao

1. listar torres por condominio
2. criar torre
3. editar torre
4. ativar e inativar torre
5. integrar com unidades

## Resultado esperado

Ao final deste modulo, o sistema deve conseguir:

- cadastrar torres por condominio
- evitar duplicidade de nome dentro do mesmo condominio
- conhecer a faixa de andares da torre
- preparar a base para o modulo de unidades
- permitir leitura clara da estrutura fisica do condominio
