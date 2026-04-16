# Endpoints - Mensagens

## GET `/mensagens`

Lista mensagens da caixa do usuario logado.

### Query params

- `caixa`
  - `entrada`
  - `enviadas`
  - `respondidas`
  - `arquivadas`
- `tipo`
- `condominio_id`
  - opcional e mais util para `admin`

### Perfis

- `admin`
- `morador`
- `funcionario`

## GET `/mensagens/resumo`

Retorna o resumo da caixa do usuario:

- `entrada`
- `nao_lidas`
- `arquivadas`
- `enviadas`
- `respondidas`

## GET `/mensagens/destinatarios`

Lista destinatarios validos no contexto do usuario logado.

### Perfis

- `admin`
- `morador`
- `funcionario`

### Regra

- `admin` pode compor mensagens para moradores e funcionarios do proprio condominio
- `morador` e `funcionario` enxergam destinatarios coerentes com o proprio condominio

## GET `/mensagens/:id`

Retorna detalhe da mensagem:

- mensagem
- destinatarios
- arquivos

## POST `/mensagens`

Cria mensagem interna manual.

### Payload

```json
{
  "condominio_id": "uuid-opcional-no-contexto-do-admin",
  "tipo": "mensagem",
  "categoria_evento": "mensagem_manual",
  "entidade_tipo": null,
  "entidade_id": null,
  "mensagem_pai_id": null,
  "titulo": "Assunto",
  "conteudo": "Texto da mensagem",
  "prioridade": "media",
  "acao_requerida": "responder",
  "destinatarios": ["uuid-1", "uuid-2"],
  "anexos": [
    {
      "nome_original": "comprovante.pdf",
      "data_url": "data:application/pdf;base64,..."
    }
  ]
}
```

### Limites

- ate `3` anexos por mensagem
- ate `4 MB` por arquivo

## PATCH `/mensagens/:id/lida`

Marca a mensagem como lida para o destinatario logado.

## PATCH `/mensagens/:id/arquivar`

Arquiva a mensagem para o destinatario logado.

## PATCH `/mensagens/:id/acao`

Registra uma acao do destinatario sobre a mensagem.

### Payload

```json
{
  "status_destinatario": "acionado"
}
```

### Valores validos

- `nao_lido`
- `lido`
- `acionado`
- `resolvido`
- `arquivado`
