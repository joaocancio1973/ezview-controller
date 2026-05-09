# Automacao Local de Git

Este documento registra a primeira camada de automacao local de versionamento do `EzView`.

## Objetivo

Reduzir risco e aumentar consistencia antes de cada commit, sem transformar o fluxo em algo rigido ou cego.

## O que foi criado

- [`scripts/git-check.ps1`](C:/ezview-controller/scripts/git-check.ps1)
  - checklist visual local antes do commit
- [`.githooks/pre-commit`](C:/ezview-controller/.githooks/pre-commit)
  - protecao automatica antes de commitar
- [`.gitmessage.txt`](C:/ezview-controller/.gitmessage.txt)
  - modelo base de mensagem de commit

## O que o pre-commit protege

Bloqueia commit quando encontrar no stage:

- `backend/.env`
- arquivos `.env.*` que nao sejam exemplo
- uploads reais em `frontend/uploads/`
- arquivos temporarios locais como `backend/tmp-*.mjs`
- conteudo de `tmp-edge-pdf/`

## O que o checklist avisa

- commit direto na `main`
- mudanca em `backend/` ou `frontend/` sem atualizacao em `docs/`

Esses avisos nao bloqueiam o commit por si so. Eles servem como camada de consciencia operacional.

## Como acompanhar visualmente

### 1. Pelo terminal

Rodar:

```powershell
.\scripts\git-check.ps1
```

### 2. Pelo VSCode

O projeto ganhou uma task dedicada:

- `git: checklist da fase`

Ela executa o mesmo script e mostra:

- branch atual
- arquivos staged
- alertas
- arquivos sensiveis bloqueados

## Fluxo sugerido

1. trabalhar na branch da fase
2. fazer `git add` do que estiver pronto
3. rodar o checklist
4. revisar alertas
5. commitar com mensagem padronizada

## Configuracao recomendada do Git local

Para ativar esta automacao no repositorio:

```bash
git config core.hooksPath .githooks
git config commit.template .gitmessage.txt
```

## Compatibilidade Windows

O bootstrap do hook `pre-commit` foi ajustado para ambiente Windows, evitando dependencia de `env + bash` no cabecalho do arquivo.

Diretriz atual:

- o hook inicia com `sh` simples
- o executor real continua sendo o PowerShell
- o checklist local segue centralizado em `scripts/git-check.ps1`

Com isso, o fluxo de commit volta a funcionar normalmente no Windows sem depender de `--no-verify`.

## Resultado esperado

Com isso, o projeto passa a ter:

- protecao minima contra arquivos sensiveis
- mensagens de commit mais consistentes
- acompanhamento visual da fase antes de cada commit
