# Modulo: Colaboradores da Unidade

## Objetivo

Organizar o cadastro recorrente de pessoas que trabalham diretamente para uma unidade residencial ou comercial, com foco em rastreabilidade, seguranca operacional e futura integracao com controle de acesso.

## Problema que resolve

Condominios convivem com diaristas, secretarias do lar, babas, cuidadores, motoristas e outros profissionais que frequentam a mesma unidade com recorrencia. Tratar esse publico apenas como visitante ou prestador avulso empobrece a seguranca e dificulta auditoria.

## Atores envolvidos

### Morador

- cadastra colaboradores recorrentes da propria unidade
- acompanha status e historico operacional desse colaborador
- no futuro pode delegar permissao controlada de liberacao de terceiros

### Admin

- supervisiona cadastros do proprio condominio
- pode criar ou ajustar colaborador de unidade em operacao assistida
- define politicas futuras de permissao e bloqueio

### Portaria / Funcionario

- reconhece um colaborador recorrente como perfil distinto de visitante eventual
- usa o historico para validacao operacional e auditoria

## Tabelas envolvidas

### Nova tabela principal

- `colaboradores_unidade`

### Integracao com tabelas ja existentes

- `acessos_autorizacoes`
- `acessos_eventos`
- `unidades`
- `condominios`
- `usuarios`

## Estrutura fisica recomendada

### colaboradores_unidade

- `id char(36)` PK
- `condominio_id char(36)` FK para `condominios.id`
- `unidade_id char(36)` FK para `unidades.id`
- `nome_completo varchar(150)`
- `documento varchar(30)` opcional
- `telefone varchar(20)` opcional
- `foto_identificacao_url varchar(255)` opcional
- `funcao enum('secretaria_lar','diarista','baba','cuidador','motorista','jardineiro','outro')`
- `empresa varchar(150)` opcional
- `observacoes text` opcional
- `pode_autorizar_terceiros tinyint(1)` default `0`
- `status enum('ativo','inativo','bloqueado')` default `ativo`
- `cadastrado_por_usuario_id char(36)` FK para `usuarios.id`
- `criado_em timestamp`
- `atualizado_em timestamp`

### Evolucao em acessos_autorizacoes

- `colaborador_unidade_id char(36)` opcional
- FK para `colaboradores_unidade.id`

## Regras de negocio centrais

- colaborador da unidade nao nasce como usuario autenticado do sistema nesta fase
- colaborador sempre pertence a uma unica unidade por cadastro
- o mesmo colaborador pode existir em mais de uma unidade apenas se houver novo cadastro explicito e rastreavel
- `bloqueado` deve impedir uso operacional futuro, mas nunca apagar historico
- permissao de autorizar terceiros nao deve nascer ativa por padrao
- qualquer permissao futura de liberar acessos por colaborador deve ser rastreavel e revogavel

## Tipos iniciais de funcao

- `secretaria_lar`
- `diarista`
- `baba`
- `cuidador`
- `motorista`
- `jardineiro`
- `outro`

## Fluxo funcional recomendado

### Bloco 1 - Cadastro recorrente

1. morador ou admin cadastra colaborador da unidade
2. informa nome, documento, telefone e funcao
3. define observacoes e foto de identificacao, quando houver
4. colaborador passa a existir como cadastro recorrente da unidade

### Bloco 2 - Integracao com controle de acesso

1. ao liberar acesso, o morador pode selecionar um colaborador recorrente
2. o sistema preenche os dados base da pessoa
3. a portaria identifica que se trata de colaborador da unidade e nao visitante eventual

### Bloco 3 - Delegacao controlada futura

1. condominio define se colaborador pode autorizar terceiros
2. toda autorizacao feita por colaborador gera log especifico
3. a permissao pode ser suspensa sem apagar historico

## Ordem recomendada de implementacao

1. documentar subdominio
2. modelar banco fisico
3. criar CRUD de colaboradores da unidade
4. integrar com controle de acesso
5. avaliar liberacao controlada de terceiros

## Observacoes

- este modulo e diferente de `funcionarios`, porque o colaborador nao pertence ao condominio, e sim a unidade
- este modulo tambem e diferente de `prestador` eventual, porque o colaborador possui recorrencia e contexto residencial direto
- a futura delegacao de liberacao de terceiros deve nascer como permissao separada e revogavel

## Credencial futura do colaborador

Evolucao recomendada:

- colaborador pode receber uma credencial restrita do app
- essa credencial nao deve liberar uso pleno apenas pelo cadastro
- a sessao operacional do colaborador deve depender de entrada validada no condominio
- QR Code de identificacao e um bom caminho para a fase seguinte
- ao registrar saida, a sessao operacional do colaborador deve ser encerrada
