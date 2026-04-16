import pool from "../src/config/database.js";

async function hasColumn(table, column) {
  const [rows] = await pool.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column],
  );
  return rows.length > 0;
}

async function hasIndex(table, indexName) {
  const [rows] = await pool.query(`SHOW INDEX FROM ${table} WHERE Key_name = ?`, [indexName]);
  return rows.length > 0;
}

async function constraintExists(table, constraintName) {
  const [rows] = await pool.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? LIMIT 1`,
    [table, constraintName],
  );
  return rows.length > 0;
}

try {
  if (!(await hasColumn("acessos_autorizacoes", "servico"))) {
    await pool.query(`ALTER TABLE acessos_autorizacoes ADD COLUMN servico varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER empresa`);
  }

  if (!(await hasColumn("acessos_autorizacoes", "destinado_para_funcionario_id"))) {
    await pool.query(`ALTER TABLE acessos_autorizacoes ADD COLUMN destinado_para_funcionario_id char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER qr_expira_em`);
  }

  if (!(await hasColumn("acessos_autorizacoes", "assumido_por_funcionario_id"))) {
    await pool.query(`ALTER TABLE acessos_autorizacoes ADD COLUMN assumido_por_funcionario_id char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER destinado_para_funcionario_id`);
  }

  if (!(await hasColumn("acessos_autorizacoes", "assumido_em"))) {
    await pool.query(`ALTER TABLE acessos_autorizacoes ADD COLUMN assumido_em datetime DEFAULT NULL AFTER assumido_por_funcionario_id`);
  }

  if (!(await hasIndex("acessos_autorizacoes", "idx_acessos_destinado_funcionario"))) {
    await pool.query(`ALTER TABLE acessos_autorizacoes ADD KEY idx_acessos_destinado_funcionario (destinado_para_funcionario_id)`);
  }

  if (!(await hasIndex("acessos_autorizacoes", "idx_acessos_assumido_funcionario"))) {
    await pool.query(`ALTER TABLE acessos_autorizacoes ADD KEY idx_acessos_assumido_funcionario (assumido_por_funcionario_id)`);
  }

  if (!(await hasIndex("acessos_autorizacoes", "idx_acessos_servico"))) {
    await pool.query(`ALTER TABLE acessos_autorizacoes ADD KEY idx_acessos_servico (servico)`);
  }

  if (!(await constraintExists("acessos_autorizacoes", "fk_acessos_destinado_funcionario"))) {
    await pool.query(`ALTER TABLE acessos_autorizacoes ADD CONSTRAINT fk_acessos_destinado_funcionario FOREIGN KEY (destinado_para_funcionario_id) REFERENCES funcionarios (id) ON DELETE SET NULL`);
  }

  if (!(await constraintExists("acessos_autorizacoes", "fk_acessos_assumido_funcionario"))) {
    await pool.query(`ALTER TABLE acessos_autorizacoes ADD CONSTRAINT fk_acessos_assumido_funcionario FOREIGN KEY (assumido_por_funcionario_id) REFERENCES funcionarios (id) ON DELETE SET NULL`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS funcionarios_sessoes (
      id char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
      funcionario_id char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
      condominio_id char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
      status enum('ativa','encerrada','expirada') COLLATE utf8mb4_unicode_ci DEFAULT 'ativa',
      origem enum('web','tablet','mobile','outro') COLLATE utf8mb4_unicode_ci DEFAULT 'web',
      iniciado_em datetime NOT NULL,
      ultimo_ping_em datetime NOT NULL,
      encerrado_em datetime DEFAULT NULL,
      criado_em timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_func_sessoes_funcionario_status (funcionario_id, status),
      KEY idx_func_sessoes_condominio_status (condominio_id, status),
      KEY idx_func_sessoes_iniciado_em (iniciado_em),
      CONSTRAINT fk_func_sessoes_funcionario FOREIGN KEY (funcionario_id) REFERENCES funcionarios (id) ON DELETE RESTRICT,
      CONSTRAINT fk_func_sessoes_condominio FOREIGN KEY (condominio_id) REFERENCES condominios (id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [rows1] = await pool.query(`SHOW CREATE TABLE acessos_autorizacoes`);
  const [rows2] = await pool.query(`SHOW CREATE TABLE funcionarios_sessoes`);
  console.log("===== acessos_autorizacoes =====");
  console.log(rows1[0]["Create Table"]);
  console.log("===== funcionarios_sessoes =====");
  console.log(rows2[0]["Create Table"]);
} finally {
  await pool.end();
}
