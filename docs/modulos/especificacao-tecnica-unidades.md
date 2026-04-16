# Especificacao Tecnica: Revisao de Unidades

## Objetivo

Definir a regra tecnica oficial para unicidade da tabela `unidades`, eliminando ambiguidade entre restricoes atuais e preparando o CRUD definitivo do modulo `Estrutura Condominial`.

## Contexto atual

A tabela `unidades` possui hoje as seguintes constraints de unicidade:

- `uk_unidade_condominio (condominio_id, identificacao)`
- `uk_unidade_torre (torre_id, identificacao)`
- `uk_unidade_logica (condominio_id, torre_id, identificacao)`

## Problema tecnico atual

As tres constraints ao mesmo tempo introduzem redundancia e podem criar conflito de interpretacao em cenarios reais.

Exemplos:

- em condominios com torres, a identificacao costuma ser unica no contexto da torre
- em condominios sem torres, a identificacao costuma ser unica no contexto do condominio
- manter todas as combinacoes simultaneamente restringe mais do que o necessario e dificulta a manutencao da regra de negocio

## Regra funcional desejada

A unidade deve obedecer a seguinte logica:

- quando houver `torre_id`, a unicidade deve ser `torre_id + identificacao`
- quando `torre_id` for nulo, a unicidade deve ser `condominio_id + identificacao`

## Regra tecnica recomendada

### Regra de aplicacao

O backend deve validar antes de inserir ou atualizar:

- se `torre_id` estiver preenchido:
  - nao permitir outra unidade com o mesmo `torre_id` e a mesma `identificacao`
- se `torre_id` estiver nulo:
  - nao permitir outra unidade com o mesmo `condominio_id`, `torre_id` nulo e a mesma `identificacao`

### Regra de banco recomendada

A melhor direcao tecnica e reduzir as constraints para um modelo coerente com a regra funcional.

Opcao recomendada para implementacao futura:

1. remover:
   - `uk_unidade_condominio`
   - `uk_unidade_logica`
2. manter:
   - `uk_unidade_torre (torre_id, identificacao)`
3. complementar a validacao no backend para o caso `torre_id IS NULL`

## Justificativa da recomendacao

- o MySQL permite varios valores `NULL` em indice unico
- isso favorece o caso de `uk_unidade_torre`, porque unidades sem torre nao colidem entre si apenas por esse indice
- o caso sem torre pode ser controlado com consulta explicita no service
- essa abordagem reduz redundancia e deixa a regra mais legivel

## Alternativa mais rigida

Se no futuro for necessario garantir tudo no banco sem depender apenas da aplicacao, sera preciso avaliar estrategia adicional, como:

- coluna derivada de chave logica
- trigger
- ajuste estrutural da modelagem

Neste momento, isso nao e necessario para a fase embrionaria do projeto.

## Regra para create/update

Ao criar ou atualizar unidade, o service deve:

1. validar se o condominio existe
2. validar se a torre pertence ao mesmo condominio quando `torre_id` for informado
3. normalizar `identificacao`
4. verificar duplicidade conforme o contexto:
   - com torre
   - sem torre
5. somente depois persistir a unidade

## Casos de teste esperados

### Deve permitir

- Torre A / Unidade 101
- Torre B / Unidade 101
- Condominio sem torre / Unidade 101
- outro condominio sem torre / Unidade 101

### Nao deve permitir

- Torre A / Unidade 101 duplicada
- mesmo condominio sem torre / Unidade 101 duplicada
- unidade vinculada a torre de outro condominio

## Impacto no CRUD futuro

O CRUD de `unidades` deve nascer com:

- validacao de contexto
- validacao de duplicidade por regra funcional
- mensagens de erro claras
- documentacao alinhada com essa especificacao

## Ordem recomendada

1. revisar dados existentes em `unidades`
2. confirmar se ha dados que violariam a regra-alvo
3. planejar migracao de constraints
4. implementar service com validacao correta
5. liberar CRUD de `unidades`

## Arquivos que devem referenciar esta regra futuramente

- `docs/modulos/estrutura-condominial.md`
- `docs/regras-de-negocio.md`
- futuro controller/service de `unidades`
- documentacao de endpoint de `unidades`
