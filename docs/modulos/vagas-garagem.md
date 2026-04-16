# Modulo - Vagas de Garagem

## Problema que resolve

Estrutura as vagas fisicas do condominio para posterior vinculo com unidades e veiculos.

## Quem usa

- admin

## Tabelas envolvidas

- `vagas_garagem`
- `condominios`
- `unidades`
- `veiculos`

## Regras iniciais

- a vaga pertence ao `condominio`
- a vaga pode ou nao estar vinculada a uma `unidade`
- a identificacao deve ser unica dentro do condominio
- o vinculo com `veiculos` e opcional e posterior

## Ordem de uso

1. cadastrar vagas
2. opcionalmente vincular vagas a unidades
3. depois vincular veiculos as vagas
