# Modulo: Admins

## Objetivo

Permitir que o `super_admin` gerencie os administradores da plataforma.

## Tabelas relacionadas

- `usuarios`
- `admins`
- `planos`

## Fluxos atuais

- criar admin
- listar admins

## Regras importantes

- apenas `super_admin` acessa este modulo
- a criacao precisa respeitar o plano e o limite de condominios
