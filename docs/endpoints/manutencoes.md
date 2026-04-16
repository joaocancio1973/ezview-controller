# Endpoints: Manutencoes

## Objetivo

Expor a primeira fase operacional do modulo de `Manutencao e Reformas`, baseada em ordens de servico, eventos e registro fotografico.

## Base path

- `/manutencoes`

## Perfis permitidos

### Admin

- visao completa no proprio condominio
- cria ordens
- altera responsavel
- altera status
- consulta historico

### Funcionario

- atua no proprio condominio
- cria ordem operacional
- altera status
- consulta historico

### Morador

- sem acesso direto nesta fase

## GET `/manutencoes`

Lista ordens de servico no escopo permitido.

### Query params

- `condominio_id`
  - obrigatorio para `admin`
- `status`
- `prioridade`
- `tipo_origem`

### Resposta

```json
{
  "ordens": [
    {
      "id": "uuid",
      "titulo": "Revisao da bomba",
      "tipo_origem": "preventiva",
      "prioridade": "alta",
      "status": "planejada"
    }
  ]
}
```

## POST `/manutencoes`

Cria nova ordem de servico.

### Payload principal

- `condominio_id`
  - obrigatorio para `admin`
- `ocorrencia_id`
- `area_comum_id`
- `torre_id`
- `unidade_id`
- `prestador_servico_id`
- `funcionario_responsavel_id`
- `tipo_origem`
- `alvo_tipo`
- `titulo`
- `descricao_tecnica`
- `local_referencia`
- `prioridade`
- `data_prevista`
- `prazo_final_em`
- `custo_previsto`
- `bloqueia_area`
- `observacoes_internas`
- `anexos`

### Anexos

- ate `3` imagens
- JPG, PNG ou WEBP
- compactadas no frontend antes do envio

## PATCH `/manutencoes/:id/status`

Atualiza o status da ordem.

### Payload

- `status`
- `descricao_evento` opcional
- `custo_informado` opcional

## PATCH `/manutencoes/:id/responsavel`

Atualiza o responsavel interno.

### Payload

- `funcionario_responsavel_id`

## GET `/manutencoes/:id/historico`

Retorna:

- resumo da ordem
- trilha operacional
- registro fotografico

### Resposta

```json
{
  "ordem_servico": {},
  "eventos": [],
  "anexos": []
}
```

## Observacoes

- `ordens de servico` sao a base operacional desta fase
- o historico e append-only por eventos
- fotos apoiam analise, execucao e auditoria tecnica
