# Inbox Interno

## Objetivo

Criar uma caixa interna com comportamento de correio eletronico para o ecossistema do condominio, permitindo:

- entradas
- enviadas
- respondidas
- arquivadas
- rastreabilidade por entidade do sistema

## Perfis

- `admin`
- `morador`
- `funcionario`
- `sistema`

## Base tecnica

O modulo reaproveita e evolui a base legada:

- `mensagens`
- `mensagem_destinatarios`
- `mensagem_arquivos`

## Campos estruturais adicionados

### `mensagens`

- `categoria_evento`
- `entidade_tipo`
- `entidade_id`
- `mensagem_pai_id`
- `prioridade`
- `status`
- `acao_requerida`
- `metadados_json`
- `criado_por_tipo`
- `atualizado_em`

### `mensagem_destinatarios`

- `status_destinatario`
- `acao_em`
- `arquivado`
- `arquivado_em`
- `respondido_em`

## Caixas da interface

- `Entrada`
- `Enviadas`
- `Respondidas`
- `Arquivadas`

## Experiencia da interface

- contagem por caixa
- badge de nao lidas no menu
- toast para novas mensagens
- leitura em painel duplo
- composicao manual com resposta encadeada
- anexos leves
  - imagem
  - PDF
  - Word
  - Excel
  - TXT

## Regras

- o inbox e multi-tenant por `condominio`
- `morador` e `funcionario` atuam apenas no proprio contexto condominial
- `admin` atua no contexto do(s) condominio(s) sob sua gestao
- o `morador` nao enxerga uma lista livre de usuarios; ele fala por canais coerentes do proprio condominio
  - `Administracao`
  - `Portaria`
  - `Administrativo`
  - `Manutencao`
- ao responder uma mensagem, o remetente original deve aparecer como destino valido automaticamente, desde que pertença ao mesmo condominio
- arquivar nao apaga historico
- leitura, acao e resposta devem permanecer auditaveis
- mensagens operacionais do sistema podem apontar para:
  - `reserva`
  - `ocorrencia`
  - `acesso`
  - futuro `financeiro`

## Integracao inicial

### Reservas

O primeiro caso de uso real do inbox interno e `Reservas`.

Quando uma reserva com taxa e criada:

- o morador recebe mensagem de `pagamento pendente`
- o admin recebe aviso de `reserva aguardando confirmacao`

Quando o admin atualiza a reserva:

- o morador recebe retorno de:
  - confirmacao
  - cancelamento
  - rejeicao de pagamento

Quando o morador recebe a mensagem de pagamento pendente:

- pode marcar `pagamento enviado` pelo proprio inbox
- isso deve levar a cobranca para `em_analise` na fase financeira

Quando o admin recebe a demanda financeira da reserva:

- pode confirmar o pagamento pelo inbox
- pode rejeitar o pagamento pelo inbox

## Evolucao recomendada

- toast em tempo real para mensagens novas
- anexo de comprovante no proprio inbox
- confirmacao/rejeicao operacional via inbox
- relacao com financeiro transacional externo
