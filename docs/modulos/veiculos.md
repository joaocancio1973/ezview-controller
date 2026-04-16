# Veiculos

## Objetivo

Este modulo representa os veiculos vinculados aos moradores e unidades do condominio.

Ele deve sustentar:

- cadastro administrativo de veiculos
- vinculacao do veiculo a `usuario`, `unidade` e opcionalmente `vaga_garagem`
- identificacao futura por leitura de placa
- validacao futura por QR Code
- base para operacao de portaria, guarita e vigilancia
- experiencia guiada de cadastro por `tipo -> marca -> modelo -> ano`

## Relacao com o banco atual

O banco ja possui a tabela `vagas_garagem`, que representa o espaco fisico.

A tabela `veiculos` deve representar o bem efetivamente cadastrado.

Separacao correta:

- `vagas_garagem`
  - espaco fisico do condominio
- `veiculos`
  - bem vinculado ao morador/unidade
- `veiculo_marcas`
  - catalogo local de fabricantes por tipo
- `veiculo_modelos`
  - catalogo local de modelos por marca
- `veiculo_modelo_anos`
  - catalogo local de anos disponiveis por modelo

Assim, um veiculo pode:

- estar vinculado a uma vaga
- trocar de vaga no futuro sem perder historico logico
- existir mesmo antes da vaga ser formalmente atribuida
- ser cadastrado via selecao inteligente sem depender de digitacao manual em campos sensiveis

## Estrutura fisica recomendada

### Tabela operacional

- `veiculos`
  - `id`
  - `condominio_id`
  - `unidade_id`
  - `usuario_id`
  - `vaga_id` opcional
  - `placa`
  - `placa_normalizada`
  - `tipo`
  - `marca`
  - `modelo`
  - `cor`
  - `ano_modelo`
  - `observacoes`
  - `modo_acesso_preferencial`
  - `qrcode_token_hash`
  - `qrcode_ativo`
  - `principal`
  - `status`
  - `criado_em`
  - `atualizado_em`

### Catalogo local de apoio

- `veiculo_marcas`
  - `id`
  - `tipo`
  - `nome`
  - `codigo_referencia`
  - `ativo`
  - `criado_em`
  - `atualizado_em`

- `veiculo_modelos`
  - `id`
  - `marca_id`
  - `nome`
  - `codigo_referencia`
  - `ativo`
  - `criado_em`
  - `atualizado_em`

- `veiculo_modelo_anos`
  - `id`
  - `modelo_id`
  - `ano_modelo`
  - `combustivel`
  - `codigo_referencia`
  - `ativo`
  - `criado_em`
  - `atualizado_em`

## Estrutura fisica ja aplicada no banco

### `veiculos`

```sql
CREATE TABLE `veiculos` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `condominio_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unidade_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vaga_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `placa` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `placa_normalizada` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('carro','moto','camionete','utilitario','bicicleta','outro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'carro',
  `marca` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modelo` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cor` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ano_modelo` smallint DEFAULT NULL,
  `observacoes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modo_acesso_preferencial` enum('placa','qrcode','ambos') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ambos',
  `qrcode_token_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qrcode_ativo` tinyint(1) DEFAULT '1',
  `principal` tinyint(1) DEFAULT '0',
  `status` enum('ativo','inativo','bloqueado') COLLATE utf8mb4_unicode_ci DEFAULT 'ativo',
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_veiculo_placa_condominio` (`condominio_id`,`placa_normalizada`),
  UNIQUE KEY `uk_veiculo_qrcode` (`qrcode_token_hash`),
  KEY `idx_veiculos_unidade` (`unidade_id`),
  KEY `idx_veiculos_usuario` (`usuario_id`),
  KEY `idx_veiculos_vaga` (`vaga_id`),
  KEY `idx_veiculos_status` (`status`),
  KEY `idx_veiculos_principal` (`principal`),
  CONSTRAINT `fk_veiculos_condominio` FOREIGN KEY (`condominio_id`) REFERENCES `condominios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_veiculos_unidade` FOREIGN KEY (`unidade_id`) REFERENCES `unidades` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_veiculos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_veiculos_vaga` FOREIGN KEY (`vaga_id`) REFERENCES `vagas_garagem` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Catalogo inteligente de selecao

Fluxo de UX pretendido:

1. escolher `tipo`
2. carregar apenas as `marcas` daquele tipo
3. escolher `marca`
4. carregar apenas os `modelos` daquela marca
5. escolher `modelo`
6. carregar apenas os `anos` daquele modelo

Vantagens:

- reduz erro humano
- evita digitar marca/modelo livremente
- prepara integracao futura com FIPE ou outro provedor
- melhora o fluxo para moradores, prestadores e equipe do condominio

## Regras de negocio

- o modulo ja suporta edicao administrativa do veiculo, incluindo troca de vaga, unidade, morador, status e catalogo do veiculo


- todo veiculo pertence a um `condominio`
- todo veiculo deve estar vinculado a uma `unidade`
- todo veiculo deve estar vinculado a um `usuario`
- `vaga_id` e opcional nesta fase
- `placa_normalizada` deve ser salva sem mascara e em caixa alta
- a placa deve ser unica dentro do mesmo condominio
- o sistema deve aceitar futura leitura automatica por camera a partir da `placa_normalizada`
- o QR Code nao deve salvar payload bruto sensivel; deve usar token proprio com hash salvo no banco
- `principal` indica o veiculo de referencia daquela pessoa/unidade, sem impedir veiculos adicionais
- o cadastro operacional deve preferir o catalogo local em vez de depender de API externa em tempo real

## Identificacao futura

### Leitura por placa

Base tecnica:

- usar `placa_normalizada`
- comparar com leitura de camera/LPR
- permitir busca rapida por placa no contexto do condominio

### Validacao por QR Code

Base tecnica:

- gerar token proprio por veiculo
- salvar apenas `qrcode_token_hash`
- permitir invalidacao e regeneracao futura

## Ordem de implementacao sugerida

1. criar tabela `veiculos`
2. criar tabelas de catalogo `veiculo_marcas`, `veiculo_modelos`, `veiculo_modelo_anos`
3. documentar endpoints
4. criar CRUD administrativo inicial
5. depois integrar com morador/titular
6. depois integrar com vaga
7. depois evoluir para portaria, camera e QR
8. por fim, sincronizar catalogo com fonte externa quando o projeto pedir isso


