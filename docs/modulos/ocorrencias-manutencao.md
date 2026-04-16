# Modulo: Ocorrencias e Manutencao

## Objetivo

Organizar reclamacoes, falhas, incidentes e demandas de manutencao do condominio, permitindo que morador, admin e funcionarios registrem, acompanhem e concluam atendimentos com rastreabilidade completa.

## Problema que resolve

No dia a dia do condominio surgem problemas de limpeza, eletrica, hidraulica, seguranca, elevadores, areas comuns e manutencao interna. Quando esses pedidos ficam dispersos em conversa informal, telefone ou anotacao solta, o condominio perde historico, responsabilidade, prazo e capacidade de auditoria.

## Atores envolvidos

### Morador

- abre ocorrencia da sua unidade ou do condominio
- acompanha andamento do pedido
- recebe devolutiva quando houver conclusao

### Admin

- supervisiona todas as ocorrencias do seu ecossistema
- encaminha atendimento
- prioriza, reclassifica e conclui
- usa a trilha para auditoria e gestao interna

### Funcionario

- recebe demandas conforme sua area de atuacao
- registra inicio de atendimento, observacoes e conclusao
- nao apaga historico operacional

## Tabelas envolvidas

### Nova tabela principal sugerida

- `ocorrencias`

### Nova tabela de trilha operacional sugerida

- `ocorrencias_eventos`

### Integracao com tabelas ja existentes

- `usuarios`
- `condominios`
- `unidades`
- `funcionarios`

## Estrutura fisica recomendada

### ocorrencias

- `id char(36)` PK
- `condominio_id char(36)` FK para `condominios.id`
- `unidade_id char(36)` opcional FK para `unidades.id`
- `aberto_por_usuario_id char(36)` FK para `usuarios.id`
- `funcionario_responsavel_id char(36)` opcional FK para `funcionarios.id`
- `origem enum('morador','admin','funcionario')`
- `categoria enum('eletrica','hidraulica','limpeza','seguranca','elevador','area_comum','portaria','obra_manutencao','administrativo','outro')`
- `titulo varchar(160)`
- `descricao text`
- `local_referencia varchar(160)` opcional
- `prioridade enum('baixa','media','alta','critica')` default `media`
- `status enum('aberta','em_analise','em_atendimento','concluida','cancelada')` default `aberta`
- `aberta_em datetime`
- `concluida_em datetime` opcional
- `criado_em timestamp`
- `atualizado_em timestamp`

### ocorrencias_eventos

- `id char(36)` PK
- `ocorrencia_id char(36)` FK para `ocorrencias.id`
- `condominio_id char(36)` FK para `condominios.id`
- `usuario_id char(36)` FK para `usuarios.id`
- `funcionario_id char(36)` opcional FK para `funcionarios.id`
- `tipo_evento enum('abertura','encaminhamento','analise','inicio_atendimento','observacao','conclusao','cancelamento','reclassificacao')`
- `status_resultante enum('aberta','em_analise','em_atendimento','concluida','cancelada')` opcional
- `descricao_evento text` opcional
- `criado_em timestamp`

## Categorias iniciais recomendadas

- `eletrica`
- `hidraulica`
- `limpeza`
- `seguranca`
- `elevador`
- `area_comum`
- `portaria`
- `obra_manutencao`
- `administrativo`
- `outro`

## Regras de negocio centrais

- toda ocorrencia pertence a um unico condominio
- ocorrencia pode ou nao estar vinculada a uma unidade especifica
- morador so pode abrir ocorrencia no proprio contexto condominial
- funcionario so atende ocorrencias do seu condominio
- conclusao e cancelamento nao apagam trilha anterior
- alteracoes operacionais relevantes devem gerar evento em `ocorrencias_eventos`
- prioridade alta ou critica deve ficar destacada nas telas operacionais
- admin pode encaminhar para funcionario de area compativel

## Fluxo funcional recomendado

### Bloco 1 - Abertura

1. morador, admin ou funcionario abre uma ocorrencia
2. informa categoria, titulo, descricao, local e prioridade
3. sistema registra origem, contexto e horario

### Bloco 2 - Triagem

1. admin visualiza novas ocorrencias
2. reclassifica se necessario
3. atribui funcionario responsavel quando houver atendimento interno
4. status muda para `em_analise` ou `em_atendimento`

### Bloco 3 - Execucao

1. funcionario registra observacoes e andamento
2. pode iniciar atendimento
3. ao concluir, registra fechamento com descricao final

### Bloco 4 - Supervisao

1. admin acompanha abertas, em atendimento e concluidas
2. usa periodo, categoria e prioridade como filtros
3. acessa trilha completa para auditoria

## Status atual da implementacao

- banco fisico criado
- backend implementado
- visao inicial de morador, funcionario e admin plugada na SPA
- historico de ocorrencia implementado

## Ordem recomendada de implementacao

1. documentar subdominio
2. modelar banco fisico
3. CRUD basico
4. visao do morador
5. visao operacional do funcionario
6. supervisao administrativa
7. evoluir para anexos e fotos

## Observacoes

- este modulo deve nascer fortemente auditavel
- conclusao nao deve esconder historico
- fotos e anexos podem ficar para fase seguinte

## Anexos leves

- ocorrencias podem receber ate 3 fotos leves na abertura
- anexos ficam em ocorrencias_anexos`r
- objetivo e contextualizar e resolver, sem transformar o modulo em burocracia pesada

