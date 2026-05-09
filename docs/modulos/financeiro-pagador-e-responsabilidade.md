# Financeiro - Pagador e Responsabilidade Financeira da Unidade

## Objetivo

Definir a modelagem funcional e logica do pagador no `EzView`, para que boleto, taxa condominial e cobrancas recorrentes nascam com base consistente, auditavel e sem ambiguidade.

## Principio funcional

No `EzView`, a cobranca nao deve nascer apenas apontando para um `morador` solto.

A logica oficial recomendada e:

- a `unidade` e o centro financeiro
- o `pagador` e uma pessoa responsavel vinculada a essa unidade
- a cobranca pertence ao contexto da unidade
- a responsabilidade financeira pode mudar ao longo do tempo sem quebrar o historico

## Decisao funcional principal

O sistema deve reconhecer a figura de:

- `responsavel_financeiro_da_unidade`

Essa entidade existe para responder:

- quem recebe a cobranca
- quem e o pagador principal
- quem possui os dados necessarios para emissao oficial
- quem esta habilitado para producao financeira

## O que essa decisao resolve

- evita acoplar cobranca diretamente ao morador logado
- preserva historico quando houver troca de titular ou responsavel
- deixa a unidade como eixo da taxa condominial
- organiza melhor reserva com taxa, boleto, lote mensal e segunda via

## Camadas de dados do pagador

### 1. Dados minimos obrigatorios para producao

Sem esses dados, o sistema nao deve emitir boleto oficial.

- `tipo_pagador`
- `nome_completo`
- `cpf_cnpj`
- `email`
- `telefone_principal`
- `cep`
- `logradouro`
- `numero`
- `bairro`
- `cidade`
- `uf`
- `ativo_para_cobranca`
- `recebe_cobranca`

### 2. Dados recomendados

Nao devem bloquear implementacao local, mas sao altamente desejaveis.

- `complemento`
- `telefone_whatsapp`
- `nome_responsavel_financeiro`
- `observacao_financeira`

### 3. Dados de controle e governanca

- `validado_em`
- `validado_por`
- `ambiente_financeiro`
- `gateway_customer_id`
- `gateway_conta_id`

## Proposta de entidade logica

### `unidades_responsaveis_financeiros`

Entidade recomendada para modelar a responsabilidade financeira da unidade.

### Finalidade

- vincular a unidade a um usuario pagador
- guardar dados e estados da relacao financeira
- preservar historico de substituicao de responsavel

## Chaves e relacionamentos

### Chave primaria

- `id`

### Chaves estrangeiras

- `condominio_id -> condominios.id`
- `unidade_id -> unidades.id`
- `usuario_id -> usuarios.id`
- `gateway_conta_id -> financeiro_gateway_contas.id` opcional
- `validado_por -> usuarios.id` opcional
- `substitui_responsavel_id -> unidades_responsaveis_financeiros.id` opcional

### Relacionamentos principais

- um `condominio` possui muitas `unidades`
- uma `unidade` pode ter varios registros historicos de responsabilidade financeira
- uma `unidade` deve ter no maximo um responsavel financeiro `ativo` por vez
- um `usuario` pode ser responsavel financeiro de mais de uma unidade, se a regra de negocio permitir
- uma `financeiro_cobranca` deve apontar para o registro de responsabilidade financeira vigente no momento da emissao, e nao apenas para o `usuario_id`

## Campos recomendados da entidade

- `id`
- `condominio_id`
- `unidade_id`
- `usuario_id`
- `tipo_pagador` (`pf` | `pj`)
- `nome_completo`
- `cpf_cnpj`
- `email`
- `telefone_principal`
- `telefone_whatsapp`
- `cep`
- `logradouro`
- `numero`
- `complemento`
- `bairro`
- `cidade`
- `uf`
- `ativo`
- `recebe_cobranca`
- `preferencia_envio`
- `ambiente_financeiro`
- `gateway_customer_id`
- `gateway_conta_id`
- `validado_em`
- `validado_por`
- `substitui_responsavel_id`
- `observacao_financeira`
- `criado_em`
- `atualizado_em`
- `encerrado_em`

## Regras de unicidade recomendadas

### Regra 1

Deve existir apenas um responsavel financeiro ativo por unidade.

Leitura funcional:

- `unidade_id + ativo = 1` deve ser unico no nivel da regra de negocio

### Regra 2

O mesmo usuario nao deve ser vinculado repetidamente como responsavel financeiro ativo da mesma unidade.

Leitura funcional:

- `unidade_id + usuario_id + ativo = 1`

## Onde a cobranca deve apontar

Em vez de depender apenas de:

- `financeiro_cobrancas.usuario_id`

o modelo recomendado e a cobranca apontar tambem para:

- `responsavel_financeiro_id -> unidades_responsaveis_financeiros.id`

Assim, a cobranca preserva:

- quem era o pagador responsavel no momento da emissao
- mesmo que depois o titular ou o responsavel financeiro mudem

## Relacao com `usuarios`

Parte dos dados continua em `usuarios`, como identidade geral.

Exemplos:

- nome
- email
- telefone principal
- documento

Mas o dominio financeiro precisa poder congelar os dados relevantes do pagador no momento da responsabilidade financeira, porque:

- o usuario pode alterar email ou telefone principal
- a cobranca historica nao deve perder coerencia

## Relacao com `unidade_usuarios`

O responsavel financeiro deve, preferencialmente, ser alguem ja vinculado a unidade via `unidade_usuarios`.

Regra recomendada:

- so podem ser marcados como responsavel financeiro usuarios vinculados a unidade, salvo excecao futura formalmente tratada

## Relacao com `financeiro_cobrancas`

Campos logicos recomendados em `financeiro_cobrancas`:

- `unidade_id`
- `usuario_id` como redundancia operacional controlada
- `responsavel_financeiro_id`
- `condominio_id`

### Motivo da redundancia controlada

Ela ajuda leitura, relatorios e integracao com telas, desde que a origem oficial da responsabilidade seja:

- `responsavel_financeiro_id`

## Relacao com `financeiro_gateway_contas`

Cada registro de responsabilidade financeira pode estar associado a uma conta/subconta oficial do gateway no contexto do condominio.

Isso nao significa que o morador tem conta propria no gateway.

Significa que:

- o pagador esta operando dentro da conta financeira do condominio

## Atomicidade entre processos

Este e um ponto critico.

### Regra geral

A emissao de uma cobranca oficial deve acontecer em transacao logica coerente, evitando estados quebrados.

### O que deve ser atomico no dominio local

Ao emitir cobranca localmente:

1. criar ou atualizar a cobranca
2. vincular `responsavel_financeiro_id`
3. registrar evento financeiro
4. registrar tentativa de emissao

Esses passos devem ficar consistentes entre si.

### O que nao e atomico com o mundo externo

Criar uma cobranca no gateway nao participa da mesma transacao do banco local.

Por isso, o sistema deve trabalhar com:

- estados intermediarios controlados
- retentativa
- reconciliacao

### Padrao recomendado

1. iniciar contexto local
2. validar elegibilidade do pagador
3. marcar cobranca como `pendente` ou `rascunho`
4. chamar gateway
5. se sucesso:
   - persistir ids externos
   - registrar evento de emissao
   - mudar status interno para `emitido`
6. se falha:
   - registrar erro de tentativa
   - manter status coerente

## Regra de troca de responsavel financeiro

Quando a unidade trocar de responsavel financeiro:

- o registro anterior deve ser encerrado, nao apagado
- o novo registro deve apontar para o anterior em `substitui_responsavel_id`, quando isso ajudar auditoria
- cobrancas ja emitidas permanecem ligadas ao responsavel vigente da epoca

## Regras de producao

Para um responsavel financeiro estar apto a producao:

- `ativo = 1`
- `recebe_cobranca = 1`
- `ambiente_financeiro = producao`
- dados minimos completos
- unidade ativa
- condominio habilitado financeiramente

## Regras de seguranca

- alteracao do responsavel financeiro deve ser auditavel
- alteracao de dados financeiros criticos deve gerar trilha
- integracao com boleto nao deve confiar apenas em dados volateis de `usuarios`

## Beneficios do modelo

- protege historico financeiro
- evita ambiguidade sobre quem paga
- deixa a unidade no centro do financeiro
- sustenta reserva com taxa e taxa condominial no mesmo desenho
- reduz risco de quebra quando houver troca de morador titular

## Proximo passo recomendado

Depois desta decisao funcional:

- refletir a entidade no plano de implementacao
- complementar a modelagem fisica do banco
- decidir quais campos ficam congelados na entidade financeira e quais continuam sendo apenas de identidade geral
