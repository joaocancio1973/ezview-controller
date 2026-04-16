# Modulo: Areas Comuns, Reservas e Agenda

## Objetivo

Organizar o uso dos espacos coletivos do condominio e transformar as reservas em uma agenda operacional clara.

## Escopo da fase 1

- `areas_comuns`
  - cadastro por condominio
  - nome livre e descricao
  - exige reserva
  - exige taxa
  - valor da taxa
  - ativo
- `reservas`
  - reserva por area, unidade e usuario
  - data/hora inicial e final
  - `dia_inteiro`
  - `status`
  - `status_pagamento`
- agenda derivada das reservas
  - leitura por periodo
  - leitura por area

## Perfis envolvidos

- `admin`
  - cadastra areas comuns
  - cria reservas operacionais
  - acompanha reservas e disponibilidade
  - confirma ou cancela reservas
  - valida o pagamento quando a area exigir taxa
- `morador`
  - ja possui visao inicial de reservas e areas comuns do proprio condominio
  - ja pode solicitar reserva no proprio contexto de unidade
  - acompanha sua propria agenda e status das solicitacoes
  - ja recebe indicativos simples de disponibilidade por area

## Base inicial padronizada

Foi definida uma base inicial de areas comuns para todos os condominios do ambiente, preservando registros equivalentes ja existentes quando encontrados.

Catalogo-base aplicado:

- Salao de Festa Principal
- Piscina Social
- Area de Churrasqueira com Piscina Reservada
- Piscina Infantil com Parquinho Tematico
- Academia
- Auditorio
- Quadra de Tenis 1
- Quadra de Tenis 2
- Quadra de Futebol
- Salao de Leitura e Videoconferencia
- Brinquedoteca

Observacao:

- como a tabela `areas_comuns` ainda nao possui campos estruturados para capacidade, horario ou regras detalhadas, essas informacoes podem ficar provisoriamente em `descricao` nesta fase

## Regras de negocio iniciais

### Areas comuns

- cada area comum pertence a um unico condominio
- o condominio pode ter quantas areas comuns quiser
- areas com nomes semelhantes devem ser diferenciadas pelo proprio nome
- a area pode exigir ou nao reserva
- a area pode exigir ou nao taxa
- se houver taxa, o valor deve ser registrado em moeda local
- a area pode ser ativada ou inativada sem ser removida da base
- o morador visualiza apenas as areas ativas do seu proprio condominio
- o morador visualiza indicadores simples de disponibilidade por area sem expor dados sensiveis de terceiros

### Reservas

- a area comum pode exigir ou nao reserva obrigatoria
- se a area nao exigir taxa, a reserva pode ser confirmada diretamente pelo admin
- se a area exigir taxa, a reserva nasce `pendente` e com `status_pagamento = pendente`
- a reserva so pode ser confirmada quando o `status_pagamento` estiver em `pago` ou `isento`
- a reserva deve sempre apontar para uma area, uma unidade e um usuario
- a mesma area nao pode aceitar reservas com sobreposicao de horario
- o status da reserva deve refletir o momento operacional da solicitacao
- a agenda e uma visao derivada das reservas, nao uma tabela separada nesta fase
- o admin so pode operar areas e reservas dos condominios que pertencem ao seu contexto
- o morador ve apenas as reservas do proprio contexto
- o morador solicita reserva sempre com base no proprio vinculo ativo de unidade

## Relacao com areas_comuns e reservas

### areas_comuns

- representa o recurso fisico compartilhado
- descreve o que pode ser reservado
- guarda configuracoes como necessidade de reserva e taxa

### reservas

- representa o ato de uso de uma area comum em um intervalo de tempo
- guarda o periodo reservado
- guarda o status operacional e o status financeiro basico
- alimenta a agenda operacional

## Agenda

- a reserva e o evento temporal
- a agenda e a leitura consolidada dos eventos ao longo do tempo
- condominios diferentes nao devem compartilhar a mesma base de agenda
- para o morador, a agenda nesta fase serve como base para indicadores simples de disponibilidade por area

## Fase 2 sugerida

- capacidade maxima da area
- horario de funcionamento
- antecedencia minima para reserva
- aprovacao manual de reservas
- limite de reservas por unidade ou por mes
- reservas recorrentes
- notificacoes automaticas
- comprovante ou integracao de pagamento
- calendario visual por area, torre ou condominio
- integracao com notificacoes para confirmacao e lembrete
- refinamento mobile-first da jornada completa do morador

## Ordem de implementacao

1. cadastrar area comum
2. listar areas comuns
3. criar reserva
4. listar reservas por area e por periodo
5. bloquear conflitos de horario
6. construir agenda visual
7. permitir confirmacao e cancelamento operacional pelo admin
8. abrir a visao inicial do morador
9. liberar a solicitacao de reserva pelo morador
10. indicar disponibilidade simples por area para o morador

## Resultado esperado

Ao final deste modulo, o sistema deve conseguir:

- cadastrar e listar areas comuns por condominio
- registrar reservas com status basico
- impedir conflitos de horario na mesma area
- exibir agenda operacional simples e clara
- oferecer ao admin cards-resumo e leitura visual mais operacional das reservas
- oferecer ao admin uma selecao de data assistida com calendario nativo e atalhos rapidos de agenda
- manter o formulario de reserva com campos de data e horario organizados para uso em desktop e tablet
- entregar ao morador uma visao inicial, leve e mobile-friendly das areas comuns e das proprias reservas
- permitir ao morador solicitar reserva com seguranca dentro do proprio contexto
- sinalizar disponibilidade simples por area para apoiar a decisao do morador
- preparar o terreno para regras mais avancadas de uso compartilhado
