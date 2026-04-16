# Governanca de Versionamento Git

Este documento prepara o `EzView` para entrar em versionamento com seguranca, previsibilidade e historico util.

## Objetivos

- proteger a evolucao do codigo
- permitir rollback controlado
- separar codigo versionado de arquivos locais e sensiveis
- padronizar encoding e quebra de linha
- reduzir ruido no repositorio

## Arquivos-base criados

- `.gitignore`
  - ignora dependencias, `.env`, uploads gerados em runtime, logs e temporarios
- `.editorconfig`
  - orienta o editor a salvar arquivos textuais em `UTF-8`
- `.gitattributes`
  - ajuda a normalizar texto e arquivos binarios no Git

## Politica recomendada

### 1. Nunca versionar

- `node_modules/`
- arquivos `.env`
- uploads de runtime em `frontend/uploads/`
- logs e pastas temporarias

### 2. Sempre versionar

- codigo-fonte
- migracoes
- scripts de banco
- documentacao em `docs/`
- `package.json` e `package-lock.json`

### 3. Estrategia de branch

Padrao recomendado:

- `main`
  - linha estavel do projeto
- `codex/<tema>`
  - branches de implementacao e refinamento

Exemplos:

- `codex/controle-acesso-fila`
- `codex/inbox-interno`
- `codex/manutencao-fase1`

## Fluxo recomendado

1. inicializar o repositorio
2. revisar os arquivos ignorados
3. fazer o primeiro commit estrutural
4. seguir com commits pequenos por modulo

## Primeiro commit sugerido

Escopo recomendado:

- estrutura atual do projeto
- backend
- frontend
- docs
- migracoes
- arquivos de governanca Git

Mensagem sugerida:

`chore: iniciar versionamento do ezview`

## Boas praticas de commit

- `feat:` nova funcionalidade
- `fix:` correcao
- `docs:` documentacao
- `refactor:` reorganizacao sem alterar regra funcional
- `style:` ajustes visuais e de apresentacao
- `chore:` manutencao tecnica

## Risco e rollback

O Git resolvera bem rollback de:

- frontend
- backend
- documentacao

Para banco de dados, manter a regra:

- toda alteracao estrutural relevante deve nascer em script de migracao
- antes de mudancas sensiveis, fazer backup do banco

## Observacao sobre encoding

O projeto ja apresenta sinais de mistura de encoding em alguns arquivos antigos.

Diretriz daqui em diante:

- salvar novos arquivos em `UTF-8`
- evitar copiar texto de fontes que corrompam acentos
- normalizar gradualmente arquivos legados em uma passada tecnica propria

## Quando o Git estiver disponivel na maquina

Sequencia sugerida:

1. `git init`
2. `git add .`
3. `git status`
4. `git commit -m "chore: iniciar versionamento do ezview"`

## Estado esperado apos essa preparacao

Com esta base, o projeto ja fica pronto para:

- iniciar o repositorio com menos ruido
- evitar versionar arquivos sensiveis
- manter historico limpo
- facilitar rollback e auditoria tecnica
