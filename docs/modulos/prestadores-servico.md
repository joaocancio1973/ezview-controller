# Modulo: Prestadores de Servico

## Objetivo

Organizar o cadastro recorrente de empresas e profissionais que prestam servicos ao condominio, reduzindo redigitacao na portaria, melhorando seguranca operacional, fortalecendo auditoria de acessos e formando uma lista util de contatos do condominio.

## Problema que resolve

No dia a dia do condominio, a portaria recebe tecnicos de internet, tv, agua, energia, construcao civil, saude, setor comercial, automotivo e outras areas. Quando tudo isso e tratado como prestador avulso sem memoria operacional, a equipe perde tempo, a rastreabilidade fica pobre e o historico de reincidencia se enfraquece.

## Atores envolvidos

### Portaria / Funcionario

- localiza rapidamente prestadores recorrentes
- reaproveita cadastro ao registrar nova entrada
- registra novos prestadores quando necessario
- usa historico para apoiar decisao operacional
- pode fazer cadastro rapido sem sair do fluxo do atendimento

### Admin

- supervisiona prestadores do proprio condominio
- pode bloquear ou inativar prestador recorrente
- usa a base para auditoria e acompanhamento

### Morador

- consulta contatos utilitarios do condominio
- no futuro pode selecionar prestador recorrente da base do condominio

## Tabelas envolvidas

### Nova tabela principal sugerida

- `prestadores_servico`

### Integracao com tabelas ja existentes

- `acessos_autorizacoes`
- `acessos_eventos`
- `condominios`
- `usuarios`

## Estrutura fisica recomendada

### prestadores_servico

- `id char(36)` PK
- `condominio_id char(36)` FK para `condominios.id`
- `nome_prestador varchar(150)`
- `documento varchar(30)` opcional
- `empresa varchar(150)` opcional
- `telefone varchar(20)` opcional
- `email varchar(150)` opcional
- `placa varchar(10)` opcional
- `veiculo_descricao varchar(150)` opcional
- `responsavel_nome varchar(150)` opcional
- `categoria_servico enum('energia_eletrica','agua_hidraulica','construcao_civil','internet_tv_rede','saude','personal','setor_comercial','automotivo','limpeza','manutencao_geral','entrega_tecnica','outro')`
- `observacoes text` opcional
- `contato_utilitario tinyint(1)` default `0`
- `atende_24h tinyint(1)` default `0`
- `telefone_secundario varchar(20)` opcional
- `whatsapp varchar(20)` opcional
- `status enum('ativo','inativo','bloqueado')` default `ativo`
- `ultimo_acesso_em datetime` opcional
- `cadastrado_por_usuario_id char(36)` FK para `usuarios.id`
- `criado_em timestamp`
- `atualizado_em timestamp`

### Evolucao sugerida em acessos_autorizacoes

- `prestador_servico_id char(36)` opcional
- FK para `prestadores_servico.id`

## Categorias iniciais de servico

- `energia_eletrica`
- `agua_hidraulica`
- `construcao_civil`
- `internet_tv_rede`
- `saude`
- `personal`
- `setor_comercial`
- `automotivo`
- `limpeza`
- `manutencao_geral`
- `entrega_tecnica`
- `outro`

## Regras de negocio centrais

- prestador recorrente pertence ao condominio, nao a uma unidade especifica
- o mesmo cadastro pode atuar como contato utilitario do condominio quando marcado para isso
- bloqueio do prestador nao deve apagar seu historico de acessos anteriores
- portaria deve poder localizar prestador por nome, documento, empresa, placa e categoria de servico
- ao registrar um novo acesso, a portaria deve priorizar sugestoes de prestadores recorrentes ja conhecidos
- quando um prestador conhecido for reutilizado, o sistema deve reaproveitar os dados base e atualizar `ultimo_acesso_em`
- prestador recorrente nao e o mesmo que `colaborador_unidade`
- portaria deve poder cadastrar um novo prestador diretamente no fluxo quando nao houver correspondencia previa

## Fluxo funcional recomendado

### Bloco 1 - Cadastro recorrente

1. admin cadastra um prestador recorrente
2. informa nome, documento, empresa, categoria de servico e veiculo quando houver
3. prestador passa a compor a base inteligente do condominio
4. se marcado como contato utilitario, tambem passa a integrar a lista de apoio operacional do condominio

### Bloco 2 - Sugestao operacional na portaria

1. ao informar categoria, nome, empresa ou placa
2. o sistema sugere prestadores recorrentes relacionados
3. se houver correspondencia, os dados sao reaproveitados
4. se nao houver, a portaria pode acionar cadastro rapido no proprio modal

### Bloco 3 - Integracao com controle de acesso

1. a autorizacao ou entrada espontanea pode apontar para `prestador_servico_id`
2. o historico de entradas e saidas passa a fortalecer a memoria operacional daquele prestador
3. auditoria futura pode listar reincidencias, negacoes e tempo medio de permanencia

### Bloco 4 - Historico do prestador

1. admin ou portaria consulta o historico do prestador
2. o sistema apresenta total de acessos, finalizados, negados e abertos
3. os ultimos atendimentos ficam disponiveis para consulta operacional

## Ordem recomendada de implementacao

1. documentar subdominio
2. modelar banco fisico
3. CRUD administrativo basico
4. autocomplete/sugestao na portaria
5. integrar com `Acessos`
6. evoluir para metricas e reincidencia

## Status atual da implementacao

- banco fisico criado com `prestadores_servico`
- `prestador_servico_id` integrado em `acessos_autorizacoes`
- CRUD administrativo basico implementado
- lista de contatos utilitarios implementada
- sugestao inteligente na portaria por nome, empresa, documento, placa e categoria implementada
- selecao de prestador recorrente integrada ao fluxo de acesso do morador e da portaria
- cadastro rapido pela portaria implementado
- historico por prestador implementado

## Observacoes

- este modulo e diferente de `colaboradores_unidade`, porque o prestador recorrente pertence ao contexto operacional do condominio
- este modulo nao substitui a autorizacao de acesso; ele a enriquece
- a experiencia ideal da portaria deve permitir localizar rapido um prestador ja conhecido antes de criar outro cadastro

## Lista de contatos do condominio

Uso adicional recomendado:

- eletricista de plantao
- encanador
- internet e tv
- chaveiro
- ambulancia e saude
- construcao civil
- automotivo
- suporte comercial

Regras sugeridas:

- `contato_utilitario = 1` inclui o cadastro na lista de contatos uteis
- `atende_24h = 1` destaca contatos de plantao
- a lista deve ser acessivel para `admin` e `morador` conforme politica do condominio
