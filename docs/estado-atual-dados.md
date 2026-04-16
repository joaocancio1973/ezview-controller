# Estado Atual dos Dados

Data de referencia: 2026-03-28

Este documento registra a primeira fotografia real do banco `ezview_controller` apos a consolidacao inicial dos fluxos de `admins`, `condominios` e `usuarios`.

## Resumo executivo

- usuarios totais: 6
- super_admin: 1
- admins: 5
- condominios totais: 6
- admins com condominios cadastrados: 2
- torres: 0
- unidades: 0
- vinculos em `unidade_usuarios`: 0

## Usuarios cadastrados

- Joao Cancio Alves da Silva Neto
  - email: joaocancio1973@gmail.com
  - perfil: super_admin
  - status: ativo
  - criado em: 2026-01-31 17:07:03 UTC
- Jomario Meneses de Menezes
  - email: admin.teste2@exemplo.com
  - perfil: admin
  - status: ativo
  - criado em: 2026-02-13 16:40:43 UTC
- Pedro Silva
  - email: pedrosilva@email.com
  - perfil: admin
  - status: ativo
  - criado em: 2026-02-21 17:54:12 UTC
- Antonio Carlos Magalhaes
  - email: acm@email.com
  - perfil: admin
  - status: ativo
  - criado em: 2026-02-21 18:46:42 UTC
- Maria do Socorro
  - email: mariadosocorro@email.com
  - perfil: admin
  - status: ativo
  - criado em: 2026-03-27 00:26:35 UTC
- Lucas Levi
  - email: lucaslevi2011@gmail.com
  - perfil: admin
  - status: ativo
  - criado em: 2026-03-27 00:47:07 UTC

## Limites por admin

- Antonio Carlos Magalhaes
  - email: acm@email.com
  - limite de condominios: 25
  - total atual: 5
  - saldo atual: 20
  - observacao: e o admin com maior volume de dados de teste ate o momento
- Jomario Meneses de Menezes
  - email: admin.teste2@exemplo.com
  - limite de condominios: 5
  - total atual: 0
  - saldo atual: 5
- Lucas Levi
  - email: lucaslevi2011@gmail.com
  - limite de condominios: 6
  - total atual: 1
  - saldo atual: 5
- Maria do Socorro
  - email: mariadosocorro@email.com
  - limite de condominios: 100
  - total atual: 0
  - saldo atual: 100
  - observacao: limite alto para fase de teste, revisar depois se este volume continuara fazendo sentido na regra comercial
- Pedro Silva
  - email: pedrosilva@email.com
  - limite de condominios: 25
  - total atual: 0
  - saldo atual: 25

## Condominios cadastrados

- halllive
  - razao social: hall
  - cnpj: 02134505000154
  - cidade: Salvador
  - estado: Bahia
  - admin: Antonio Carlos Magalhaes
- Manson de la playa
  - razao social: Soleil de Manson
  - cnpj: 01236547888888
  - cidade: Salvador
  - estado: Bahia
  - admin: Antonio Carlos Magalhaes
- MarjorieVIlle
  - razao social: hall
  - cnpj: 02.012.015/0001-55
  - cidade: Salvador
  - estado: Bahia
  - admin: Antonio Carlos Magalhaes
- Poseidon
  - razao social: Grand Ville Verde Mar
  - cnpj: 01236547000155
  - cidade: Salvador
  - estado: Bahia
  - admin: Antonio Carlos Magalhaes
- Tubaraoville
  - razao social: Praia de Tubarao Ville
  - cnpj: 09876543000100
  - cidade: Salvador
  - estado: Bahia
  - admin: Antonio Carlos Magalhaes
- Jaguaribe Ville
  - razao social: Jaguaribe Mall
  - cnpj: 08000880000185
  - cidade: Salvador
  - estado: Bahia
  - admin: Lucas Levi

## Auditoria de consistencia de CNPJ

- 5 condominios armazenam CNPJ com `14` digitos sem mascara
- 1 condominio armazena CNPJ formatado com pontuacao
- nenhum registro atual caiu na classificacao `fora_do_padrao`

Detalhamento:

- halllive
  - cnpj salvo: 02134505000154
  - cnpj numerico: 02134505000154
  - padrao: somente_digitos_14
- Jaguaribe Ville
  - cnpj salvo: 08000880000185
  - cnpj numerico: 08000880000185
  - padrao: somente_digitos_14
- Manson de la playa
  - cnpj salvo: 01236547888888
  - cnpj numerico: 01236547888888
  - padrao: somente_digitos_14
- MarjorieVIlle
  - cnpj salvo: 02.012.015/0001-55
  - cnpj numerico: 02012015000155
  - padrao: formatado
- Poseidon
  - cnpj salvo: 01236547000155
  - cnpj numerico: 01236547000155
  - padrao: somente_digitos_14
- Tubaraoville
  - cnpj salvo: 09876543000100
  - cnpj numerico: 09876543000100
  - padrao: somente_digitos_14

## Observacoes tecnicas

- os dados atuais confirmam que a criacao e o isolamento de condominios por admin estao funcionando conforme esperado
- ainda nao existem dados em `torres`, `unidades` ou `unidade_usuarios`
- ha inconsistencia de padrao de armazenamento de CNPJ em `condominios`
- o campo `estado` esta sendo salvo por extenso, nao como sigla
- ha registro com espaco sobrando no final de `nome_completo` em `Maria do Socorro `

## Recomendacoes imediatas

- padronizar a persistencia de CNPJ no backend antes da expansao dos proximos CRUDs
- decidir se `estado` sera armazenado como sigla ou por extenso e manter um unico padrao
- incluir saneamento de espacos extras em campos textuais no backend
- manter este arquivo atualizado sempre que houver mudanca relevante na base de dados inicial
