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

## Integracao atual ja ativa

Mesmo antes dos endpoints administrativos, a fase 1 ja integra:

- `Reservas`
- `Mensagens`

com:

- criacao automatica de cobranca para reserva com taxa
- sincronizacao de status financeiro
- trilha de eventos financeiros
