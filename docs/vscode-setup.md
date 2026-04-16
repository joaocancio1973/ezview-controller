# Setup recomendado do VSCode

Este documento registra a configuracao recomendada do VSCode para o projeto `EzView`.

## Objetivo

Deixar o ambiente mais confortavel para:

- versionamento com Git e GitHub
- leitura de historico
- manutencao do codigo
- menor ruido visual
- padronizacao de encoding

## Extensoes recomendadas

### GitHub Pull Requests and Issues

- extensao oficial do GitHub
- melhora autenticacao e integracao com repositorios remotos

### GitLens

- historico por linha
- autores
- comparacao de mudancas

### Git Graph

- visualizacao grafica de branches e historico

### Prettier

- ajuda a formatar arquivos do frontend e JSON quando necessario

### ESLint

- util para evolucao futura da disciplina de qualidade do frontend

## Arquivos preparados no projeto

- [`.vscode/extensions.json`](C:/ezview-controller/.vscode/extensions.json)
- [`.vscode/settings.json`](C:/ezview-controller/.vscode/settings.json)
- [`.vscode/tasks.json`](C:/ezview-controller/.vscode/tasks.json)

## Ajustes aplicados

- `UTF-8` como encoding padrao
- final de linha em `LF` para arquivos textuais do projeto
- menor ruido de highlight unicode ambiguo
- auto save leve
- autofetch de Git
- terminal padrao em PowerShell
- tarefas prontas para subir o backend

## Observacao importante

Esses ajustes deixam o VSCode preparado, mas ainda nao substituem:

- instalacao do executavel `git`
- autenticacao real com a conta GitHub

## Passo seguinte

Assim que o Git estiver disponivel no sistema:

1. abrir o projeto no VSCode
2. aceitar as extensoes recomendadas
3. confirmar `git --version`
4. iniciar o repositorio local
5. conectar ao GitHub
