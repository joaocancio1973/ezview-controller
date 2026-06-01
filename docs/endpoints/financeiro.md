# Endpoints - Financeiro

## Observacao

Na fase 1, o dominio financeiro nasce primeiro por modelagem fisica e integracao com `Reservas` e `Mensagens`.

Os endpoints abaixo representam o desenho recomendado para a camada administrativa seguinte.

## GET `/financeiro/cobrancas`

Lista cobrancas do contexto do `admin`.

### Filtros previstos

- `condominio_id`
- `status`
- `origem`
- `unidade_id`
- `usuario_id`
- `vencimento_de`
- `vencimento_ate`
- `busca`
- `pagina`
- `limite`

### Estados que a listagem deve reconhecer

- `rascunho`
- `pendente`
- `emitido`
- `em_analise`
- `pago`
- `isento`
- `cancelado`
- `rejeitado`
- `vencido`

## GET `/financeiro/cobrancas/:id`

Retorna:

- cobranca
- eventos
- vinculos com reserva
- contexto de unidade e usuario
- contexto do `responsavel financeiro`, quando houver

## GET `/financeiro/responsaveis`

Lista as unidades do condominio e a situacao atual do `responsavel financeiro`.

### Filtros ativos

- `condominio_id`
- `busca`

### Retorno esperado

- unidade
- torre
- condominio
- ocupacao da unidade
- morador principal de referencia, quando houver
- `responsavel_financeiro_id`
- `usuario_id`
- dados basicos do pagador
- flags de cobranca
- `ambiente_financeiro`
- `situacao_financeira`
- lista de `pendencias`

## GET `/financeiro/unidades/:unidadeId/responsavel-opcoes`

Retorna os dados da unidade para configuracao e os candidatos ativos em `unidade_usuarios`.

Observacao de comportamento atual:

- o modal administrativo usa autopreenchimento de endereco por `CEP`
- a consulta preenche automaticamente:
  - `logradouro`
  - `bairro`
  - `cidade`
  - `uf`

### Retorno esperado

- `unidade`
- `responsavel_atual`
- `candidatos`

## POST `/financeiro/responsaveis`

Salva ou substitui o `responsavel financeiro` da unidade.

### Payload atual

```json
{
  "unidade_id": "uuid-da-unidade",
  "usuario_id": "uuid-do-usuario",
  "tipo_pagador": "pf",
  "nome_completo": "Fulano da Silva",
  "cpf_cnpj": "000.000.000-00",
  "email": "fulano@email.com",
  "telefone_principal": "71999999999",
  "cep": "40000-000",
  "logradouro": "Rua Exemplo",
  "numero": "100",
  "complemento": "Apto 101",
  "bairro": "Centro",
  "cidade": "Salvador",
  "uf": "BA",
  "ambiente_financeiro": "teste",
  "preferencia_envio": "email_e_inbox",
  "ativo_para_cobranca": true,
  "recebe_cobranca": true,
  "observacao_financeira": "Responsavel validado pela administracao"
}
```

## PATCH `/financeiro/cobrancas/:id/status`

Permite governanca administrativa do status financeiro.

### Payload previsto

```json
{
  "status": "pago",
  "observacao_interna": "Validado manualmente"
}
```

## GET `/financeiro/cobrancas/:id/eventos`

Lista o historico append-only da cobranca.

## POST `/financeiro/cobrancas/:id/comprovantes`

Anexa comprovantes diretamente a uma cobranca do contexto do `admin`.

### Comportamento atual

- aceita ate `3` arquivos por envio
- ate `5 MB` por arquivo
- formatos aceitos:
  - `pdf`
  - `jpg`
  - `png`
  - `webp`
- registra evento financeiro append-only de comprovante anexado

## POST `/financeiro/gateway/contas`

Previsto para registrar ou vincular a conta financeira oficial do condominio no gateway.

## POST `/financeiro/cobrancas/:id/emitir-boleto`

Previsto para emissao oficial da cobranca no gateway, com retorno de:

- `gateway_charge_id`
- `linha_digitavel`
- `boleto_url`
- `boleto_pdf_url`

## POST `/financeiro/cobrancas/:id/segunda-via`

Previsto para gerar nova via, com rastreabilidade da cobranca anterior.

## POST `/financeiro/webhooks/:gateway`

Endpoint tecnico previsto para recepcao de eventos do gateway.

Regras:

- persistir payload bruto
- processar com idempotencia
- atualizar cobranca local apenas apos validacao

## POST `/financeiro/lotes/taxa-condominial`

Previsto para geracao em lote de cobrancas mensais por unidade ativa.

## Integracao atual ja ativa

Mesmo antes dos endpoints administrativos, a fase 1 ja integra:

- `Reservas`
- `Mensagens`

com:

- criacao automatica de cobranca para reserva com taxa
- sincronizacao de status financeiro
- trilha de eventos financeiros

## Tela administrativa atual

Na fase atual, o `admin` ja possui tela propria de leitura financeira, consumindo:

- `GET /financeiro/cobrancas`
- `GET /financeiro/cobrancas/:id`

### Parametros ja ativos em `GET /financeiro/cobrancas`

- `condominio_id`
- `status`
- `origem`
- `unidade_id`
- `vencimento_de`
- `vencimento_ate`
- `busca`
- `pagina`
- `limite`

## Observacao arquitetural

A arquitetura oficial de boletos do `EzView` esta documentada em:

- `docs/modulos/financeiro-boletos-arquitetura.md`

## Observacao de fase atual

A base do banco ja foi preparada para a fase 2 do financeiro com boletos:

- `responsavel_financeiro_id`
- dados de gateway em `financeiro_cobrancas`
- tabelas de contas, webhook e notificacoes

O proximo passo funcional e adaptar o backend e os endpoints para governar oficialmente esses campos e estados no fluxo de emissao.
