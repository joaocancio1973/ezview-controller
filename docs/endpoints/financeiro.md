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

## GET `/financeiro/cobrancas/:id`

Retorna:

- cobranca
- eventos
- vinculos com reserva
- contexto de unidade e usuario

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

Previsto para fase seguinte, quando `financeiro_anexos` entrar.

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
