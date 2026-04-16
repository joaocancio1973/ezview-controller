# Modulo: Unidades

## Objetivo

Representar a ocupacao fisica real dentro do condominio, seja em torres, blocos, casas, lojas ou salas.

Este modulo conecta a estrutura fisica ao uso cotidiano do condominio e serve de base para:

- moradores
- dependentes
- proprietarios
- visitantes
- reservas
- comunicacao segmentada
- financeiro por unidade

## Escopo inicial

- `unidades`
- relacao futura com `unidade_usuarios`

## Tabelas relacionadas

- `condominios`
- `torres`
- `unidades`
- `usuarios`
- `unidade_usuarios`

## Atores

- `admin`
  - cadastra unidades do proprio contexto de condominios
  - visualiza apenas unidades ligadas aos condominios que administra
- `super_admin`
  - nao opera este modulo no fluxo atual da SPA
  - pode ter visao consolidada no futuro, em dashboard especifico

## Tipos de unidade

Tipos iniciais suportados:

- `casa`
- `apartamento`
- `sala`
- `outro`

Esses tipos cobrem:

- condominios verticais
- condominios horizontais
- condominios mistos
- unidades comerciais

## Fluxos atuais

- listar unidades de um condominio
- aplicar filtros rapidos por ocupacao: `todas`, `habitadas`, `disponiveis`
- criar unidade vinculada a um condominio do admin logado
- vincular unidade a uma torre quando aplicavel
- gerar unidades em lote a partir de uma torre

## Regras de negocio iniciais

- toda unidade pertence a um unico condominio
- a unidade pode ou nao ter `torre_id`
- a unidade deve guardar sua identificacao logica, como `101`, `202`, `Casa 12` ou `Sala 05`
- a unidade deve guardar o andar quando isso fizer sentido
- o admin so pode criar unidades nos condominios que pertencem ao seu contexto
- unidades inativas devem ser preservadas para historico, mas ocultadas nas telas padrao quando aplicavel

## Geracao automatica por torre

O modulo agora suporta uma primeira versao de geracao em lote para torres.

Objetivo:

- estruturar a torre fisicamente antes da ocupacao
- criar as unidades que ja existem no predio, ainda que nao tenham moradores vinculados
- acelerar o cadastro de torres com padrao repetitivo por andar

Parametros operacionais da geracao:

- `torre`
- `tipo`
- `andar_inicio`
- `andar_fim`
- `unidades_por_andar`
- `sequencial_inicial`

Exemplo:

- torre com andares `1` a `10`
- `4` unidades por andar
- sequencial inicial `1`

Resultado esperado:

- `101` a `104`
- `201` a `204`
- ...
- `1001` a `1004`

Observacoes importantes:

- a geracao respeita a faixa estrutural da torre
- nao sobrescreve unidades existentes
- se houver conflito de numeracao, a operacao e bloqueada
- andares especiais, tecnicos ou de lazer podem ser tratados gerando apenas a faixa desejada

## Regra de unicidade recomendada

O sistema deve evitar duplicidade conforme o contexto fisico:

- com torre: `torre_id + identificacao`
- sem torre: `condominio_id + identificacao`

Isso permite:

- torres com varios andares e varias unidades por andar
- condominios sem torre
- condominios mistos com casas, blocos e lojas no mesmo contexto

## Principios de modelagem

- a unidade e a referencia fisica principal de ocupacao
- o morador nao nasce na unidade, ele e vinculado a ela depois
- a unidade nao deve carregar regra de visita, financeiro ou mensagem
- o modulo precisa permanecer simples para que o vinculo com usuarios venha depois sem retrabalho

## Cenarios suportados

### Torre com varias unidades por andar

- uma torre pode ter varias unidades no mesmo andar
- a identificacao da unidade pode seguir a logica `101`, `102`, `201`, `202`

### Condominio de casas

- a unidade pode existir sem torre
- a identificacao pode ser algo como `Casa 12`
- a relacao com o condominio continua obrigatoria

### Condominio misto

- um mesmo condominio pode ter torres, casas e lojas
- o sistema deve permitir diferentes unidades no mesmo contexto
- a unicidade continua sendo garantida pela regra fisica correta

## Ordem de implementacao

1. listar unidades por condominio
2. criar unidade
3. gerar unidades por torre
4. editar unidade
5. ativar e inativar unidade
6. integrar com `unidade_usuarios`

## Resultado esperado

A listagem atual tambem ja oferece:

- indicador visual de ocupacao por unidade
- contagem leve de residentes vinculados
- recorte rapido entre unidades habitadas e disponiveis


Ao final deste modulo, o sistema deve conseguir:

- cadastrar unidades em torres ou diretamente no condominio
- suportar cenarios verticais, horizontais e mistos
- evitar duplicidade de identificacao no contexto correto
- preparar a base para o cadastro de moradores e dependentes
- permitir leitura clara da ocupacao real do condominio


