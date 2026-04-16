# QA Checklist - Fase Atual

## Objetivo

Validar os fluxos principais que ja foram implementados no `EzView` antes da abertura de novos modulos.

Este checklist cobre:

- permissoes por perfil
- estrutura condominial
- moradores e ativacao
- vagas e veiculos
- areas comuns e reservas

## 1. Login e Perfis

- entrar como `super_admin`
- confirmar que o menu mostra `Dashboard`, `Admins` e `Usuarios`
- confirmar que `Condominios` nao aparece para `super_admin`
- tentar abrir manualmente `?page=condominios` e validar redirecionamento

- entrar como `admin`
- confirmar que o menu mostra apenas modulos operacionais
- confirmar que `Admins` nao aparece para `admin`
- tentar abrir manualmente `?page=admins` e validar redirecionamento

## 2. Condominios

- listar condominios do `admin`
- confirmar que aparecem apenas os condominios do usuario logado
- abrir `Novo Condominio`
- validar padronizacao do `CNPJ`
- validar autocomplete por `CEP` com `ViaCEP`
- confirmar abertura do dashboard individual ao clicar no nome do condominio

## 3. Torres

- abrir `Torres`
- selecionar um condominio
- listar torres existentes
- criar nova torre
- validar:
  - nome
  - primeiro andar
  - quantidade de andares
  - faixa calculada

## 4. Unidades

- abrir `Unidades`
- selecionar condominio e torre
- carregar unidades
- validar a coluna de ocupacao:
  - `Habitada`
  - `Disponivel`
  - quantidade de residentes
- alternar filtro:
  - `Todas`
  - `Habitadas`
  - `Disponiveis`
- criar unidade manual
- testar geracao por torre

## 5. Moradores

- abrir `Moradores`
- selecionar condominio e unidade
- listar moradores existentes
- abrir `Novo Morador`
- validar carregamento de:
  - condominio
  - unidade
  - papel
- testar regra:
  - unidade com `titular` ativo deve ficar indisponivel quando o papel for `titular`
  - a mesma unidade deve poder voltar para o fluxo normal em `proprietario` ou `dependente`
- criar morador principal
- reenviar convite

## 6. Ativacao de Conta

- copiar o link temporario exibido no fluxo do admin
- abrir [ativar-conta.html](C:/ezview-controller/frontend/pages/ativar-conta.html)
- validar leitura do token
- definir senha
- confirmar mensagem de sucesso
- testar login do morador com a nova senha

## 7. Vagas de Garagem

- abrir `Vagas`
- listar vagas por condominio
- criar vaga sem unidade vinculada
- criar vaga vinculada a uma unidade
- validar:
  - identificacao
  - tipo
  - coberta
  - ativa

## 8. Veiculos

- abrir `Veiculos`
- carregar veiculos do condominio
- usar filtro `Buscar placa`
- criar veiculo novo
- validar selecao encadeada:
  - tipo
  - marca
  - modelo
  - ano
- vincular morador, unidade e vaga
- editar veiculo existente
- alterar:
  - vaga
  - cor
  - status
  - principal

## 9. Areas Comuns

- abrir `Areas Comuns`
- criar area comum
- validar:
  - nome
  - exige reserva
  - exige taxa
  - valor da taxa
  - status

## 10. Reservas

- abrir `Reservas`
- criar reserva com horario
- criar reserva `dia todo`
- validar `data_limite_confirmacao` em area com taxa
- testar conflito de horario
- validar listagem por periodo

## 11. Tema e Interface

- trocar entre modo escuro e claro
- recarregar pagina e validar persistencia
- revisar:
  - sidebar
  - cards
  - botoes principais
  - modais
  - tabelas

## 12. Registro de Bugs

Para cada problema encontrado, registrar:

- modulo
- perfil usado
- passo executado
- resultado esperado
- resultado obtido
- se e visual, funcional ou regra de negocio

## Prioridade sugerida para esta rodada

1. Moradores e ativacao
2. Vagas e veiculos
3. Unidades e ocupacao
4. Reservas
5. Revisao visual geral
