# Auth

## POST /auth/login

### Permissao

- publica

### Body

```json
{
  "email": "usuario@dominio.com",
  "senha": "senha",
  "origem": "web"
}
```

### Resposta de sucesso

```json
{
  "token": "jwt",
  "usuario": {
    "id": "uuid",
    "nome": "Nome do Usuario",
    "email": "usuario@dominio.com",
    "perfil": "super_admin",
    "sessao_funcionario_id": null
  }
}
```

### Observacoes

- autentica apenas usuarios com `status = ativo`
- quando o perfil for `funcionario`, o login cria uma sessao operacional em `funcionarios_sessoes`
- o campo `origem` aceita `web`, `tablet`, `mobile` e `outro`

## POST /auth/logout

### Permissao

- autenticada

### Regra

- encerra a sessao operacional do funcionario quando houver `sessao_funcionario_id` no token
- para outros perfis, apenas finaliza a sessao autenticada no cliente

## POST /auth/ping

### Permissao

- autenticada

### Regra

- atualiza `ultimo_ping_em` da sessao operacional do funcionario
- usado pela tela da portaria para manter o funcionario elegivel no rodizio de distribuicao
- sessoes sem `ping` podem evoluir para expiracao automatica na proxima fase, apoiando troca de turno segura
