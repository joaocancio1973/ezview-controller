# Integracao com GitHub

Este documento prepara o `EzView` para ser conectado ao GitHub do projeto com seguranca e organizacao.

## Conta de destino

- usuario GitHub: `joaocancio1973`
- perfil: [https://github.com/joaocancio1973](https://github.com/joaocancio1973)

## Antes de subir o projeto

Itens ja preparados no repositorio local:

- [`.gitignore`](C:/ezview-controller/.gitignore)
- [`.editorconfig`](C:/ezview-controller/.editorconfig)
- [`.gitattributes`](C:/ezview-controller/.gitattributes)
- [`backend/.env.example`](C:/ezview-controller/backend/.env.example)
- [`docs/governanca-versionamento-git.md`](C:/ezview-controller/docs/governanca-versionamento-git.md)

## Nome sugerido do repositorio

Opcao recomendada:

- `ezview-controller`

## Sequencia recomendada

### 1. Instalar Git

Se o Git ainda nao estiver instalado na maquina, instalar primeiro.

Depois confirmar:

```bash
git --version
```

### 2. Inicializar o projeto local

No diretorio raiz `C:\ezview-controller`:

```bash
git init
git branch -M main
git add .
git status
git commit -m "chore: iniciar versionamento do ezview"
```

### 3. Criar o repositorio no GitHub

Criar no GitHub um repositorio vazio chamado:

- `ezview-controller`

Sugestao:

- repositorio privado no inicio

## 4. Conectar remoto

Depois de criar o repositorio no GitHub:

```bash
git remote add origin https://github.com/joaocancio1973/ezview-controller.git
git push -u origin main
```

## 5. Fluxo recomendado depois da integracao

### Branch principal

- `main`

### Branches de trabalho

- `codex/<tema>`

Exemplos:

- `codex/financeiro-fase1`
- `codex/prestadores-fluxo-avancado`
- `codex/mobile-morador`

## Seguranca

Nao subir:

- arquivos `.env`
- uploads gerados em runtime
- logs
- dependencias instaladas

Ja existe protecao para isso no `.gitignore`.

## Boas praticas

- commits pequenos e objetivos
- mensagens claras
- migracoes junto com codigo quando houver mudanca de banco
- documentacao atualizada junto da funcionalidade

## Observacao importante

Neste ambiente atual, o executavel `git` ainda nao esta acessivel pelo terminal do agente.

Isso significa:

- a preparacao foi feita
- mas o `git init` e o `push` ainda precisam ser executados na maquina quando o Git estiver disponivel

## Estado final esperado

Depois dessa integracao, o projeto tera:

- versionamento real
- historico de mudancas
- backup remoto
- base para rollback
- base para colaboracao e deploy futuro
