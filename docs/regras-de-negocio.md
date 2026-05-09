# Regras de Negocio

## Permissoes por perfil

### Super Admin

- pode criar admins
- pode listar admins
- pode listar usuarios globais do sistema
- nao deve usar a tela atual para gerenciar condominios

### Admin

- pode criar condominios vinculados ao proprio usuario
- pode listar apenas os condominios criados no proprio contexto
- nao deve acessar a lista de admins
- nao deve acessar a listagem global de usuarios
- cria o morador principal e inicia o fluxo de ativacao do convidado
- cria funcionarios e controla a operacao do proprio ecossistema condominial

### Morador

- nao nasce por cadastro livre nesta fase
- entra no sistema por convite seguro enviado pelo condominio
- deve enxergar apenas o proprio contexto de unidade apos ativacao
- o titular ativado deve poder evoluir depois para cadastro de dependentes e veiculos
- qualquer morador ativo vinculado a unidade pode solicitar liberacao de acesso

### Funcionario

- nasce por cadastro do `admin`
- pertence a um unico condominio por vez
- nao herda acesso aos demais condominios do mesmo admin
- deve ativar a conta por convite seguro
- deve cair diretamente na tela operacional do seu trabalho
- nao deve ter historico de atuacao apagado fisicamente

## Multi-tenant

- cada admin deve enxergar apenas os dados do proprio escopo
- listagens sensiveis nao podem retornar dados globais para perfis restritos
- o isolamento por perfil e por vinculo ao usuario logado e regra critica do sistema

## Dominio de condominios

- a tabela oficial e `condominios`
- o vinculo oficial do condominio e `condominios.admin_id -> usuarios.id`
- a tabela legada `condominio` foi descontinuada

## Dominio de admins

- a tabela `admins` representa a extensao do usuario de perfil `admin`
- a criacao do admin envolve `usuarios` e `admins`
- o `super_admin` e o unico perfil autorizado a gerenciar esse dominio

## Dominio de usuarios

- a tabela `usuarios` representa a base de identidade do sistema
- neste momento, o `super_admin` possui visao global de listagem
- no futuro, o `admin` deve ter visao restrita apenas ao proprio ecossistema

## Estrutura condominial

### Torres

- uma torre pertence a um unico condominio
- o nome da torre deve ser unico dentro do mesmo condominio

### Unidades

- uma unidade pertence a um unico condominio
- uma unidade pode ou nao pertencer a uma torre
- a identificacao da unidade deve ser unica no contexto correto

Regra funcional pretendida:

- com torre: unicidade por `torre + identificacao`
- sem torre: unicidade por `condominio + identificacao`

### Vinculo entre unidade e usuario

- `usuarios` representa a identidade da pessoa
- `unidade_usuarios` representa o papel da pessoa dentro da unidade
- a mesma pessoa nao pode ser vinculada duas vezes a mesma unidade

### Papeis na unidade

- `proprietario`
- `titular`
- `dependente`

Regra recomendada:

- uma unidade pode ter varios `proprietarios`
- uma unidade pode ter apenas um `titular` ativo por vez
- uma unidade pode ter varios `dependentes`

### Anti-duplicidade

- o sistema deve evitar criar a mesma pessoa repetidamente quando ja existir um usuario compativel
- o vinculo `unidade_id + usuario_id` deve ser unico
- antes de vincular um novo `titular`, o sistema deve verificar se ja existe outro `titular` ativo na unidade

## Moradores e ativacao

- o `admin` cria o morador principal no contexto de uma unidade
- o morador deve receber convite por email com token de uso unico
- o sistema deve salvar apenas o hash do token de ativacao
- o convite deve ter expiracao curta, preferencialmente `48h`
- o morador nao altera sozinho a unidade vinculada no fluxo de ativacao
- depois da ativacao, o `titular` deve poder evoluir para cadastro de dependentes e veiculos

## Operacao condominial

### Areas comuns

- toda area comum pertence a um unico condominio
- a area comum deve informar se exige reserva e se exige taxa
- a area comum pode ser inativada sem apagar seu historico

### Reservas

- toda reserva pertence a uma area, uma unidade e um usuario
- a reserva nao pode conflitar com outro periodo ja ocupado na mesma area
- a reserva deve nascer em `pendente` antes de confirmacao
- `confirmada` e `cancelada` sao status operacionais basicos nesta fase

### Agenda

- a agenda e uma visao derivada das reservas, nao uma entidade separada nesta fase
- a agenda deve permitir leitura por area, condominio e periodo
- a agenda nao deve sobrescrever o historico das reservas

## Operacao de funcionarios

- o funcionario pertence ao condominio, nao ao grupo de condominios do admin
- matricula deve ser unica por condominio
- cartao digital do funcionario pertence ao seu unico condominio
- foto de identificacao deve permanecer vinculada ao cadastro funcional
- desligamento deve preservar trilha funcional e de auditoria

## Controle de acesso

- toda autorizacao de acesso pertence a um unico condominio
- visitante e prestador nao precisam nascer como usuarios do sistema nesta fase
- qualquer morador ativo vinculado a unidade pode solicitar acesso
- a portaria opera por fila do dia e validacao de eventos
- eventos de entrada e saida devem ser append-only
- correcoes devem gerar novos eventos, nao apagar historico
- a portaria nao deve aceitar duas entradas consecutivas para a mesma autorizacao
- a saida so pode ser registrada apos uma entrada valida anterior
- QR Code operacional deve ser revogavel e rastreavel
- prestador de servico deve permitir detalhar o servico solicitado
- quando houver mais de um porteiro ativo, o sistema deve distribuir solicitacoes em rodizio simples pela ordem de login
- quando houver apenas um porteiro ativo, todas as solicitacoes vao para ele
- o sistema deve registrar quem solicitou, quem recebeu, quem assumiu e quem validou cada acesso

## Documentacao e manutencao

- toda regra relevante deve ser refletida em `docs/`
- comentarios de codigo devem explicar apenas o que nao for obvio
- contratos e comportamentos devem ser documentados fora do codigo sempre que possivel

## Colaboradores da unidade

- colaborador da unidade pertence a unidade, nao ao condominio como funcionario
- colaborador recorrente deve ter cadastro proprio e rastreavel
- permissao para autorizar terceiros deve nascer desligada e ser revogavel
- bloqueio do colaborador nao remove historico operacional ja gerado
- eventual credencial do colaborador deve depender de entrada validada no condominio antes de liberar funcoes operacionais

## Prestadores de servico

- prestador recorrente pertence ao condominio, nao a uma unidade
- prestador recorrente pode tambem compor a lista de contatos uteis do condominio quando marcado para isso
- prestador recorrente nao substitui colaborador da unidade
- bloqueio ou inativacao nao remove historico operacional anterior
- portaria deve poder localizar prestador por nome, empresa, documento, placa e categoria
- a selecao de prestador recorrente deve reduzir digitacao e fortalecer auditoria de reincidencia
- contatos utilitarios devem poder ser filtrados por categoria e plantao 24h

## Ocorrencias e manutencao

- toda ocorrencia pertence a um unico condominio
- ocorrencia pode estar vinculada a unidade ou existir apenas no contexto comum do condominio
- morador so abre ocorrencia no proprio escopo condominial
- funcionario so atua em ocorrencias do seu condominio
- atribuicao de responsavel nao apaga trilha anterior
- mudanca de status deve gerar evento operacional
- conclusao e cancelamento devem permanecer auditaveis
- ocorrencias criticas ou de alta prioridade devem ter destaque visual nas telas operacionais

## Manutencao e reformas

- `ocorrencia` e o registro do problema; `manutencao` e a gestao da tratativa tecnica
- manutencao preventiva deve poder existir sem ocorrencia previa
- manutencao corretiva pode nascer diretamente ou derivar de uma ocorrencia
- reforma deve possuir trilha propria, por ter prazo, impacto e acompanhamento mais amplos
- toda manutencao e toda reforma pertencem a um unico condominio
- a execucao pode estar vinculada a area comum, torre, unidade ou estrutura geral
- prestador de servico pode ser executor vinculado, mas nao substitui a entidade de manutencao
- ordens de servico devem ser a base operacional da execucao
- manutencao concluida nao deve apagar historico tecnico da area ou item
- areas em manutencao ou reforma devem poder impactar reservas e comunicacao aos moradores
- a fase 1 fisica do modulo deve nascer com `manutencoes_ordens_servico` e `manutencoes_eventos`
- o morador nao deve ter acesso amplo ao modulo de manutencao e reformas
- o morador pode ter apenas visao resumida e contextual quando houver impacto direto ou relacao com ocorrencia propria
- a governanca da manutencao deve ficar concentrada em `admin`, com execucao controlada por `funcionario`

## Financeiro e cobrancas

- o dominio financeiro deve nascer separado de `reservas`, embora integrado a ele
- reserva com taxa deve gerar cobranca formal rastreavel
- `lancamentos_financeiros` legado deve ser preservado enquanto a migracao funcional ocorre
- status financeiro operacional deve existir em entidade propria de cobranca
- eventos financeiros devem ser append-only
- `morador` nao governa cobrancas; ele interage por sinalizacao de pagamento e leitura de retorno
- `admin` governa confirmacao, rejeicao, isencao e leitura financeira do condominio
- mensagens do inbox podem atuar como canal operacional da cobranca, mas nao substituem a entidade financeira
- boleto deve ser tratado como cobranca oficial, nao apenas como arquivo ou comprovante isolado
- o modelo recomendado para producao e conta propria ou subconta por condominio no gateway
- integracao com gateway deve nascer por camada de abstracao, evitando acoplamento excessivo a um unico provedor
- webhook e a fonte primaria de sincronizacao de status de pagamento no sistema
- todo webhook financeiro deve ser persistido e processado com idempotencia
- o `EzView` deve manter comunicacao propria com o morador por inbox e email, mesmo quando o gateway tambem notificar
- cobrancas de teste ou de moradores apenas usados para exercicio do sistema nao devem entrar automaticamente em fluxo de producao
- a unidade e o centro financeiro do condominio
- o pagador oficial deve ser tratado como responsavel financeiro da unidade, e nao apenas como morador solto
- deve existir apenas um responsavel financeiro ativo por unidade em cada momento
- cobrancas emitidas devem apontar para o registro de responsabilidade financeira vigente na epoca da emissao
- a cobranca oficial exige dados minimos consistentes do pagador:
  - `tipo_pagador`
  - `nome_completo`
  - `cpf_cnpj`
  - `email`
  - `telefone_principal`
  - `logradouro`
  - `numero`
  - `bairro`
  - `cidade`
  - `uf`
  - `cep`
- alteracao de responsavel financeiro nao pode quebrar historico de cobrancas ja emitidas
- emissao de cobranca deve preservar atomicidade local entre:
  - cobranca
  - responsavel_financeiro_id
  - evento financeiro
  - tentativa de emissao
- segunda via deve preservar rastreabilidade da cobranca original
- ativacao financeira em producao deve ser controlada por condominio

## Residentes da unidade

- somente o `titular` ativo pode agregar novos residentes pela area do morador
- o titular pode agregar `dependente` e `proprietario`, mas nao outro `titular`
- o residente agregado continua sendo um `usuario` do tipo `morador`
- o sistema deve gerar convite proprio de ativacao para o residente
- `foto_perfil_url` e `documento_identificacao` passam a preparar a base do card digital do residente
- a exclusao destrutiva nao e o comportamento ideal; o historico deve ser preservado por vinculo e convite

## Perfil do usuario logado

- o sistema deve expor o contexto do usuario autenticado no cabecalho
- para `morador`, isso inclui ao menos:
  - papel na unidade
  - unidade
  - torre, quando existir
- o proprio usuario deve poder atualizar dados pessoais basicos
  - nome
  - `phone_whatsapp`
  - `documento_identificacao`
  - `foto_perfil_url`

## Experiencia mobile do morador

- os modulos mais usados por `morador` devem priorizar leitura em celular
- tabelas operacionais devem degradar bem para blocos compactos em telas pequenas
- `Mensagens`, `Acessos`, `Prestadores` e `Ocorrencias` devem privilegiar:
  - toque facil
  - leitura simples
  - fluxos curtos

## Centro de ajuda e onboarding

- o produto deve prever uma camada de ajuda para usuarios com baixa familiaridade digital
- moradores idosos devem ser considerados explicitamente na experiencia de uso
- a ajuda deve nascer primeiro nos fluxos mais usados:
  - reservas
  - acessos
  - mensagens
  - ocorrencias
- a ajuda deve ser contextual, leve e opcional
- o sistema deve poder evoluir para um onboarding inicial e uma central de ajuda dedicada
  - hierarquia curta
  - leitura rapida

## InBox da unidade

- o `inBox` e uma lista curta de pessoas recorrentes da unidade
- o limite atual e de `10` pessoas ativas por unidade
- somente o `titular` ativo pode gerir o proprio `inBox`
- status `bloqueado` impede o fluxo livre e exige liberacao manual
- o uso em `Acessos` deve registrar `inbox_visitante_id` para auditoria

## Inbox interno

- `mensagens` e `mensagem_destinatarios` compoem a base oficial da caixa interna
- arquivamento nao remove historico
- resposta deve manter referencia em `mensagem_pai_id`
- mensagens de sistema podem apontar para entidades como `reserva`, `ocorrencia` e `acesso`
- mensagens financeiras operacionais devem preparar o terreno para futura integracao transacional externa
- o inbox deve manter leitura simples para o usuario, mas rastreabilidade suficiente para auditoria
