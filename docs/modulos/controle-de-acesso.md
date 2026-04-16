# Modulo: Controle de Acesso

## Objetivo

Organizar o fluxo de entrada e saida de pessoas no condominio, com rastreabilidade de autorizacao, validacao na portaria e historico operacional.

## Problema que resolve

O EzView precisa controlar visitantes, prestadores, entregas e validacoes de entrada com seguranca e auditoria. O modulo `Controle de Acesso` cria esse eixo operacional.

## Atores envolvidos

### Morador

- solicita acesso de visitante ou prestador
- informa nome, documento, empresa e janela de atendimento
- pode ser `titular` ou outro residente ativo vinculado a unidade
- acompanha o status da autorizacao

### Admin

- supervisiona regras e historico
- acompanha autorizacoes e operacao da portaria
- pode criar autorizacao assistida quando necessario

### Funcionario

- opera a fila da portaria
- confirma entrada
- confirma saida
- registra ajustes e negacoes
- quando for porteiro, pode receber solicitacoes distribuidas automaticamente

### Visitante / Prestador

- nao nasce como usuario do sistema nesta fase
- entra como entidade de autorizacao e evento

## Tabelas envolvidas

### Ja existentes e aplicadas

- `usuarios`
- `condominios`
- `unidades`
- `unidade_usuarios`
- `funcionarios`
- `acessos_autorizacoes`
- `acessos_eventos`
- `funcionarios_sessoes`

## Modelagem atual

### acessos_autorizacoes

- `id`
- `condominio_id`
- `unidade_id`
- `solicitante_id`
- `origem_solicitacao`
- `tipo_acesso`
- `destino_tipo`
- `destino_descricao`
- `contato_destino`
- `nome_visitante`
- `documento`
- `empresa`
- `servico`
- `placa`
- `veiculo_descricao`
- `inicio_previsto`
- `fim_previsto`
- `urgente`
- `status`
- `qr_token_hash`
- `qr_expira_em`
- `destinado_para_funcionario_id`
- `assumido_por_funcionario_id`
- `assumido_em`
- `criado_por`
- `validado_por`
- `validado_em`
- `criado_em`
- `atualizado_em`

### acessos_eventos

- `id`
- `condominio_id`
- `autorizacao_id`
- `funcionario_id`
- `funcionario_sessao_id`
- `tipo_evento`
- `origem`
- `observacao`
- `criado_em`

### funcionarios_sessoes

- `id`
- `funcionario_id`
- `condominio_id`
- `status`
- `origem`
- `iniciado_em`
- `ultimo_ping_em`
- `encerrado_em`
- `criado_em`
- `atualizado_em`

## Regras de negocio centrais

- toda autorizacao pertence a um unico condominio
- toda autorizacao deve apontar para uma unidade e um solicitante
- qualquer morador ativo vinculado a unidade pode solicitar liberacao
- a solicitacao pode ser marcada como urgente para destaque operacional na portaria
- funcionario e portaria so enxergam o condominio ao qual pertencem
- o historico de eventos e append-only
- ajustes devem gerar novo evento, nao apagar registros antigos
- a portaria nao deve aceitar duas entradas consecutivas para a mesma autorizacao
- a saida so pode ser registrada apos uma entrada valida
- quando houver mais de um porteiro ativo, as solicitacoes devem ser distribuidas em rodizio simples
- quando houver apenas um porteiro ativo, todas as solicitacoes vao para ele
- a distribuicao automatica registra quem recebeu e quem assumiu a solicitacao
- a sessao operacional do funcionario e mantida por login, ping e logout

## Fluxo implementado na fase 1

### Solicitacao do morador

1. morador abre `Acessos`
2. informa tipo, nome, documento, empresa, servico e janela prevista
3. o sistema deriva unidade e condominio automaticamente
4. o morador pode marcar a liberacao como urgente
5. a solicitacao nasce como `pendente`
6. se a portaria negar a solicitacao, o historico permanece preservado
7. o morador pode reenviar uma nova solicitacao com os mesmos dados quando necessario
8. o sistema tenta distribuir para um porteiro ativo do mesmo condominio

### Fila da portaria

1. funcionario de portaria faz login
2. o sistema abre e mantem uma sessao operacional ativa
3. a tela `Acessos` do funcionario mostra a fila priorizada por urgencia e atribuicao
4. a portaria enxerga contadores de entradas, saidas, pendencias, em andamento e urgentes
5. a mesma tela pode alternar entre `Ativos`, `Finalizados hoje`, `Negados` e `Todos hoje`
6. solicitacoes urgentes podem disparar alerta visual e sonoro configuravel
7. o funcionario registra `ajuste`, `entrada`, `saida` ou `negado`
8. o sistema grava evento append-only e atualiza a autorizacao

### Entrada espontanea na portaria

1. o porteiro pode abrir `+ Nova Entrada`
2. informa nome, documento, tipo de acesso, empresa ou servico quando houver
3. informa destino, com quem vai falar e dados do veiculo quando necessario
4. a origem nasce como `portaria`
5. o item entra imediatamente na fila do condominio, ja assumido pelo porteiro que abriu o atendimento
6. o historico continua auditavel como qualquer outra autorizacao

### Leitura do morador

1. o morador acompanha a propria lista de liberacoes
2. a lista pode ser filtrada por `em andamento`, `encerradas`, `negadas` e `todas`
3. o reenvio cria uma nova solicitacao sem apagar a anterior
4. a interface do morador deve privilegiar leitura compacta e objetiva

### Supervisao do admin

1. admin abre `Acessos`
2. escolhe o condominio
3. pode filtrar por status e periodo
4. acompanha solicitacoes, destino e responsavel atual

### Troca de turno e sessao operacional

1. a fila pertence ao condominio, nunca a um unico porteiro
2. logout do porteiro encerra apenas a sessao operacional dele, nao a fila
3. itens `pendentes` e `em_andamento` continuam visiveis para o proximo porteiro logado
4. o novo porteiro pode assumir explicitamente itens ainda abertos
5. cada evento deve guardar quem registrou, em qual sessao operacional e em qual horario
6. a fila operacional do porteiro deve mostrar destino, assumido por e ultima acao por, com horario
7. a portaria deve mostrar quem esta ativo no turno e as trocas recentes do dia
8. sessoes sem `ping` por janela de seguranca devem poder expirar sem apagar historico
9. troca de turno nao deve reatribuir automaticamente tudo sem trilha; a fila deve continuar no condominio com possibilidade de reassuncao rastreavel

## Ordem recomendada daqui para frente

1. consolidar troca de turno e supervisao de sessao operacional
2. abrir historico detalhado por autorizacao
3. adicionar QR Code de validacao
4. adicionar leitura por placa
5. evoluir para alertas e automacoes

## Observacoes

- este modulo continua vindo antes de `Inbox`
- a fase atual prioriza fluxo real de portaria e auditoria
- QR Code, placa e historico analitico ficam como evolucoes naturais da fase 2
- a negacao de acesso nao apaga a solicitacao anterior e deve continuar auditavel mesmo apos reenvio


