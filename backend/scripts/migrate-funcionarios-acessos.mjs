import pool from "../src/config/database.js";

const statements = [
  `CREATE TABLE IF NOT EXISTS funcionarios (
    id char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    usuario_id char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    condominio_id char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    cargo varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
    matricula varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
    foto_identificacao_url varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    status enum('ativo','inativo','afastado','desligado') COLLATE utf8mb4_unicode_ci DEFAULT 'ativo',
    cartao_token_hash varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    cartao_ativo tinyint(1) DEFAULT '0',
    admitido_em datetime DEFAULT NULL,
    desligado_em datetime DEFAULT NULL,
    criado_por char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    atualizado_por char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    criado_em timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_funcionario_usuario (usuario_id),
    UNIQUE KEY uk_funcionario_cartao_token_hash (cartao_token_hash),
    UNIQUE KEY uk_funcionario_matricula_condominio (condominio_id, matricula),
    KEY idx_funcionarios_condominio_status (condominio_id, status),
    KEY idx_funcionarios_criado_por (criado_por),
    KEY idx_funcionarios_atualizado_por (atualizado_por),
    CONSTRAINT fk_funcionarios_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
    CONSTRAINT fk_funcionarios_condominio FOREIGN KEY (condominio_id) REFERENCES condominios (id) ON DELETE RESTRICT,
    CONSTRAINT fk_funcionarios_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios (id) ON DELETE RESTRICT,
    CONSTRAINT fk_funcionarios_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES usuarios (id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS acessos_autorizacoes (
    id char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    condominio_id char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    unidade_id char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    solicitante_id char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    tipo_acesso enum('visitante','prestador','entrega','outro') COLLATE utf8mb4_unicode_ci NOT NULL,
    nome_visitante varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
    documento varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    empresa varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    placa varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    inicio_previsto datetime NOT NULL,
    fim_previsto datetime DEFAULT NULL,
    status enum('pendente','autorizado','em_andamento','finalizado','cancelado','negado') COLLATE utf8mb4_unicode_ci DEFAULT 'pendente',
    qr_token_hash varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    qr_expira_em datetime DEFAULT NULL,
    criado_por char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    validado_por char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    validado_em datetime DEFAULT NULL,
    criado_em timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_acessos_qr_token_hash (qr_token_hash),
    KEY idx_acessos_condominio_status (condominio_id, status),
    KEY idx_acessos_unidade_status (unidade_id, status),
    KEY idx_acessos_solicitante (solicitante_id),
    KEY idx_acessos_inicio_previsto (inicio_previsto),
    KEY idx_acessos_validado_por (validado_por),
    CONSTRAINT fk_acessos_condominio FOREIGN KEY (condominio_id) REFERENCES condominios (id) ON DELETE RESTRICT,
    CONSTRAINT fk_acessos_unidade FOREIGN KEY (unidade_id) REFERENCES unidades (id) ON DELETE RESTRICT,
    CONSTRAINT fk_acessos_solicitante FOREIGN KEY (solicitante_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
    CONSTRAINT fk_acessos_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios (id) ON DELETE RESTRICT,
    CONSTRAINT fk_acessos_validado_por FOREIGN KEY (validado_por) REFERENCES usuarios (id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS acessos_eventos (
    id char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    condominio_id char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    autorizacao_id char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
    funcionario_id char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    tipo_evento enum('entrada','saida','tentativa','negado','ajuste') COLLATE utf8mb4_unicode_ci NOT NULL,
    origem enum('manual','qrcode','placa') COLLATE utf8mb4_unicode_ci DEFAULT 'manual',
    observacao varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
    criado_em timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_acessos_eventos_condominio (condominio_id),
    KEY idx_acessos_eventos_autorizacao (autorizacao_id),
    KEY idx_acessos_eventos_funcionario (funcionario_id),
    KEY idx_acessos_eventos_tipo (tipo_evento),
    CONSTRAINT fk_acessos_eventos_condominio FOREIGN KEY (condominio_id) REFERENCES condominios (id) ON DELETE RESTRICT,
    CONSTRAINT fk_acessos_eventos_autorizacao FOREIGN KEY (autorizacao_id) REFERENCES acessos_autorizacoes (id) ON DELETE RESTRICT,
    CONSTRAINT fk_acessos_eventos_funcionario FOREIGN KEY (funcionario_id) REFERENCES funcionarios (id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];

try {
  for (const statement of statements) {
    await pool.query(statement);
  }

  const [tables] = await pool.query(`SHOW TABLES LIKE 'funcionarios'`);
  const [auths] = await pool.query(`SHOW TABLES LIKE 'acessos_autorizacoes'`);
  const [events] = await pool.query(`SHOW TABLES LIKE 'acessos_eventos'`);

  console.log(JSON.stringify({
    funcionarios: tables.length,
    acessos_autorizacoes: auths.length,
    acessos_eventos: events.length
  }, null, 2));
} finally {
  await pool.end();
}
