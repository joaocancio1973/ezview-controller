# Endpoints - Moradores e Convites

## Objetivo

Documentar os endpoints da primeira fase do cadastro de moradores e da ativacao segura de conta.

## Admin

### `POST /moradores`

Cria o morador principal no contexto de uma unidade.

Permissao:

- `admin`

Payload esperado:

```json
{
  "condominio_id": "uuid",
  "unidade_id": "uuid",
  "nome_completo": "Nome do morador",
  "email": "morador@email.com",
  "phone_whatsapp": "71999999999",
  "papel": "titular"
}
```

Comportamento esperado:

- validar se a unidade pertence ao escopo do admin logado
- criar ou localizar `usuario` com perfil `morador`
- criar vinculo em `unidade_usuarios`
- opcionalmente iniciar criacao do convite

### `GET /moradores`

Lista moradores do contexto do `admin`.

Filtros desejados:

- `condominio_id`
- `unidade_id`
- `status`
- `papel`

### `GET /moradores/:id`

Retorna os detalhes de um morador especifico.

### `POST /moradores/:id/enviar-convite`

Envia ou reenvia o convite de ativacao.

Permissao:

- `admin`

Comportamento esperado:

- gerar novo token
- invalidar convites anteriores ainda pendentes quando necessario
- registrar `enviado_em`

## Convites / Ativacao

### `GET /convites/validar?token=...`

Valida token de convite e retorna os dados necessarios para a tela de ativacao.

Resposta desejada:

```json
{
  "valido": true,
  "convite": {
    "nome_completo": "Nome do morador",
    "email": "morador@email.com",
    "condominio": "Nome do condominio",
    "torre": "Torre A",
    "unidade": "304",
    "papel": "titular",
    "expira_em": "2026-03-30T18:00:00Z"
  }
}
```

### `POST /convites/ativar`

Ativa a conta do morador a partir do convite.

Payload esperado:

```json
{
  "token": "token-bruto-do-link",
  "senha": "nova-senha-segura"
}
```

Comportamento esperado:

- validar token
- validar expiracao
- definir senha do usuario
- marcar convite como aceito
- deixar a conta pronta para login

## Fase atual do titular

### `GET /me/residentes`

Lista os moradores agregados da propria unidade do titular autenticado.

Permissao:

- `morador`

Resposta:

- `unidade`
- `residentes`

### `POST /me/residentes`

Permite ao titular autenticado cadastrar residentes da propria unidade.

Permissao:

- `morador`

Payload esperado:

```json
{
  "nome_completo": "Nome do residente",
  "email": "residente@email.com",
  "phone_whatsapp": "71999999999",
  "documento_identificacao": "123.456.789-00",
  "papel": "dependente",
  "foto_perfil": {
    "nome_original": "foto.jpg",
    "data_url": "data:image/jpeg;base64,..."
  }
}
```

Regras:

- somente `titular` ativo pode cadastrar
- o titular so pode agregar `dependente` ou `proprietario`
- o sistema gera convite seguro de ativacao
- foto e documento deixam a base pronta para card digital

### `POST /me/residentes/:id/enviar-convite`

Reenvia o convite de ativacao de um residente da mesma unidade.

Permissao:

- `morador`

## Fase futura

### `POST /me/dependentes`

Permite ao titular autenticado cadastrar dependentes da propria unidade.

### `POST /me/veiculos`

Permite ao titular autenticado cadastrar veiculos da propria unidade.

