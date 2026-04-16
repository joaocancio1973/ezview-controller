# Modulo: Manutencao e Reformas

## Objetivo

Organizar a conservacao tecnica do condominio com uma camada propria para:

- manutencao preventiva
- manutencao corretiva
- reformas e intervencoes maiores
- ordens de servico
- acompanhamento de execucao por area, prestador e responsavel

Este modulo nasce para complementar `Ocorrencias`, mas nao se confunde com ele.

## Distincao funcional importante

### Ocorrencia

Registra o problema, a reclamacao, o fato ou a necessidade percebida.

Exemplos:

- vazamento observado
- lampada queimada
- portao com falha
- sujeira em area comum
- reclamacao sobre academia

### Manutencao

Organiza a tratativa tecnica, operacional e historica da solucao.

Exemplos:

- abrir ordem de servico para trocar bomba
- planejar manutencao preventiva da piscina
- acompanhar reparo eletrico na torre B
- contratar empresa para revisar elevador

### Reforma

Trata intervencoes maiores, com prazo, impacto, fornecedores, custo e comunicacao ampliada.

Exemplos:

- reforma do salao de festas
- revitalizacao da fachada
- troca de piso da quadra
- modernizacao da academia

## Problema que resolve

Hoje o sistema ja registra ocorrencias e acessos de prestadores, mas ainda nao possui uma camada propria para gerenciar a manutencao do patrimonio. Sem isso, o condominio registra o problema, mas nao governa bem:

- planejamento preventivo
- agenda tecnica
- ordens de servico
- execucao por area
- historico de manutencao por espaco
- reformas com acompanhamento

## Atores envolvidos

### Admin

- cria planos preventivos
- abre ordens de servico
- acompanha reformas
- vincula prestadores e responsaveis
- supervisiona custo, prazo e conclusao

### Funcionario

- recebe execucao interna conforme area de atuacao
- registra inicio, andamento e conclusao
- alimenta evidencias operacionais

### Prestador de servico

- atua como executor externo de ordem de servico ou reforma
- entra no fluxo por prestador recorrente ou eventual
- nao substitui o modulo, apenas participa dele

### Morador

- pode originar a demanda por meio de `Ocorrencias`
- acompanha efeitos quando a manutencao for ligada a area comum ou unidade
- nao deve governar a ordem de servico tecnicamente
- nao deve alterar status tecnico, custo, executor ou planejamento

## Blocos funcionais principais

### 1. Manutencao preventiva

Objetivo:

- evitar falhas
- criar rotina de conservacao
- reduzir emergencias

Itens tipicos:

- elevadores
- bombas
- piscina
- portoes
- gerador
- cameras e CFTV
- iluminacao
- jardinagem tecnica
- limpeza tecnica
- inspecoes periodicas

Comportamento recomendado:

- cada item preventivo pode ter frequencia
- pode estar ligado a uma area comum, torre ou estrutura geral
- gera agenda de manutencao e, quando necessario, ordem de servico

### 2. Manutencao corretiva

Objetivo:

- resolver defeitos, falhas e avarias ja ocorridas

Origem tipica:

- ocorrencia aberta por morador
- vistoria do funcionario
- apontamento do admin
- retorno de prestador

Comportamento recomendado:

- pode nascer diretamente no modulo
- ou derivar de uma `Ocorrencia`
- deve virar ordem de servico formal quando houver execucao

### 3. Reformas

Objetivo:

- controlar intervencoes maiores e mais longas no patrimonio

Caracteristicas:

- prazo mais extenso
- impacto operacional
- possivel necessidade de comunicacao institucional
- pode envolver mais de um prestador
- pode exigir bloqueio de area, agenda especial ou aviso ao morador

Exemplos:

- reforma de piscina
- revitalizacao de hall
- troca de equipamento de academia
- ampliacao de auditorio

## Eixo operacional recomendado

### A. Cadastro tecnico de itens e areas

O sistema deve permitir identificar o que esta sendo mantido:

- area comum especifica
- torre
- unidade, quando aplicavel
- estrutura geral do condominio

Exemplos de alvo tecnico:

- `Piscina Social`
- `Academia`
- `Quadra de Futebol`
- `Portao principal`
- `Elevador Torre A`
- `Casa de bombas`

### B. Plano preventivo

Cada item pode ter:

- periodicidade
- responsavel padrao
- prestador preferencial
- proxima execucao prevista
- historico de execucoes

### C. Ordem de servico

Esta deve ser a entidade operacional central do modulo.

Ela representa:

- a execucao real de uma manutencao
- interna ou terceirizada

Campos funcionais recomendados:

- origem
  - preventiva
  - corretiva
  - reforma
  - derivada de ocorrencia
- alvo tecnico
- titulo
- descricao tecnica
- prioridade
- status
- responsavel interno
- prestador vinculado
- prazo
- data prevista
- data de inicio
- data de conclusao
- observacoes
- custo previsto
- custo realizado

### D. Historico por area

Cada area ou item tecnico deve ter memoria propria.

Exemplos:

- quantas manutencoes ja houve na piscina
- ultima revisao do elevador
- prestador que mais atuou na academia
- reforma ja realizada no salao de festas

### E. Integracao com prestadores e acessos

Prestadores entram como executores do servico.

Fluxo ideal:

1. admin abre ordem de servico
2. vincula `prestador_servico_id` quando houver
3. quando o prestador acessar o condominio, o controle de acesso pode apontar para a ordem
4. entrada e saida reforcam auditoria operacional da manutencao

## Relacao com outros modulos

### Ocorrencias

- uma ocorrencia pode gerar uma manutencao corretiva
- a ocorrencia continua sendo o registro do problema
- a manutencao passa a ser o registro da tratativa tecnica

### Prestadores de servico

- podem ser vinculados como executores
- historico do prestador passa a ganhar contexto tecnico

### Controle de acesso

- entrada de prestador pode ser associada a ordem de servico ou reforma
- melhora rastreabilidade do que foi executado e quando

### Mensagens

- pode comunicar bloqueio de area
- pode avisar manutencao agendada
- pode avisar andamento de reforma

### Areas comuns e reservas

- area em manutencao pode impactar reserva
- area em reforma pode ser temporariamente inativada

## Permissoes recomendadas

### Admin

- cria ordens de servico
- cria manutencao preventiva
- abre e acompanha reformas
- vincula prestadores e funcionarios responsaveis
- altera planejamento, prazo, prioridade e bloqueio de area
- possui supervisao completa do modulo no proprio condominio

### Funcionario

- enxerga ordens atribuidas a si ou a sua area operacional, conforme regra futura
- registra inicio, observacoes, andamento, pausa e conclusao
- nao deve apagar trilha
- nao deve reconfigurar toda a governanca da ordem

### Morador

- nao deve ter acesso amplo ao modulo
- nao cria ordem de servico diretamente nesta fase
- nao altera executor, prazo, custo ou status tecnico da manutencao
- pode acompanhar leitura resumida quando:
  - a manutencao derivar de ocorrencia aberta por ele
  - a manutencao impactar area comum ou contexto relevante para sua unidade
- a visao do morador deve ser informativa, nao operacional

## Estrutura fisica sugerida

### Tabelas principais recomendadas

- `manutencoes_itens`
- `manutencoes_planos`
- `manutencoes_ordens_servico`
- `manutencoes_eventos`
- `reformas`

### Direcao minima para primeira fase

Se quisermos nascer de forma mais enxuta, a primeira fase pode comecar com:

- `manutencoes_ordens_servico`
- `manutencoes_eventos`

e depois evoluir para:

- `planos preventivos`
- `reformas`
- `historico tecnico por item`

## Estrutura fisica definida para a fase 1

### manutencoes_ordens_servico

- `id char(36)` PK
- `condominio_id char(36)` FK para `condominios.id`
- `ocorrencia_id char(36)` opcional FK para `ocorrencias.id`
- `area_comum_id char(36)` opcional FK para `areas_comuns.id`
- `torre_id char(36)` opcional FK para `torres.id`
- `unidade_id char(36)` opcional FK para `unidades.id`
- `prestador_servico_id char(36)` opcional FK para `prestadores_servico.id`
- `funcionario_responsavel_id char(36)` opcional FK para `funcionarios.id`
- `criado_por_usuario_id char(36)` FK para `usuarios.id`
- `tipo_origem enum('preventiva','corretiva','reforma','derivada_ocorrencia','avulsa')`
- `alvo_tipo enum('area_comum','torre','unidade','estrutura_geral')`
- `titulo varchar(180)`
- `descricao_tecnica text`
- `local_referencia varchar(180)` opcional
- `prioridade enum('baixa','media','alta','critica')`
- `status enum('aberta','planejada','em_execucao','aguardando_terceiro','concluida','cancelada')`
- `prazo_final_em datetime` opcional
- `data_prevista datetime` opcional
- `iniciada_em datetime` opcional
- `concluida_em datetime` opcional
- `custo_previsto decimal(12,2)` opcional
- `custo_realizado decimal(12,2)` opcional
- `bloqueia_area tinyint(1)` default `0`
- `observacoes_internas text` opcional
- `criado_em timestamp`
- `atualizado_em timestamp`

### manutencoes_eventos

- `id char(36)` PK
- `ordem_servico_id char(36)` FK para `manutencoes_ordens_servico.id`
- `condominio_id char(36)` FK para `condominios.id`
- `usuario_id char(36)` FK para `usuarios.id`
- `funcionario_id char(36)` opcional FK para `funcionarios.id`
- `tipo_evento enum('abertura','planejamento','atribuicao','inicio_execucao','observacao','pausa','encaminhamento_terceiro','reagendamento','conclusao','cancelamento','reclassificacao')`
- `status_resultante enum('aberta','planejada','em_execucao','aguardando_terceiro','concluida','cancelada')` opcional
- `descricao_evento text` opcional
- `custo_informado decimal(12,2)` opcional
- `criado_em timestamp`

## Justificativa da fase 1

- `ordem_servico` vira a entidade operacional central
- uma ocorrencia pode ou nao derivar ordem de servico
- o modulo ja nasce pronto para operar manutencao preventiva, corretiva e pequenas reformas
- a ligacao opcional com `area_comum`, `torre`, `unidade` e `prestador` evita travar o desenho cedo demais
- `bloqueia_area` prepara o terreno para impacto futuro em reservas e uso da area

## Status recomendados

### Ordem de servico

- `aberta`
- `planejada`
- `em_execucao`
- `aguardando_terceiro`
- `concluida`
- `cancelada`

### Reforma

- `planejada`
- `aprovada`
- `em_andamento`
- `paralisada`
- `concluida`
- `cancelada`

## Fluxo funcional recomendado

### Bloco 1 - Preventiva

1. admin cadastra item tecnico ou area
2. define frequencia da manutencao
3. sistema organiza a proxima data prevista
4. quando chega o momento, nasce ordem de servico

### Bloco 2 - Corretiva

1. problema e apontado por ocorrencia ou vistoria
2. admin ou funcionario abre ordem corretiva
3. define responsavel interno ou prestador
4. acompanha execucao ate conclusao

### Bloco 3 - Reforma

1. admin abre projeto de reforma
2. define area, impacto e prazo
3. vincula prestador(es) e comunicacao relacionada
4. acompanha marcos ate conclusao

### Bloco 4 - Auditoria tecnica

1. sistema consolida historico por area ou item
2. admin consulta recorrencia, custo, prazo e executores
3. isso reforca memoria patrimonial do condominio

## Ordem recomendada de implementacao

1. documentar subdominio
2. modelar banco da primeira fase
3. implementar ordens de servico
4. integrar com `Ocorrencias`
5. integrar com `Prestadores` e `Acessos`
6. evoluir para preventiva
7. evoluir para reformas

## Observacoes estrategicas

- este modulo tende a ser um diferencial real de maturidade do sistema
- ele transforma o EzView de um sistema de registro para um sistema de gestao patrimonial
- a manutencao deve nascer com visao operacional, mas tambem com memoria historica do patrimonio
