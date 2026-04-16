import pool from "../src/config/database.js";

async function hasColumn(table, column) {
  const [rows] = await pool.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column],
  );
  return rows.length > 0;
}

async function hasIndex(table, indexName) {
  const [rows] = await pool.query(
    `SHOW INDEX FROM ${table} WHERE Key_name = ?`,
    [indexName],
  );
  return rows.length > 0;
}

try {
  if (!(await hasColumn("funcionarios", "area_atuacao"))) {
    await pool.query(`
      ALTER TABLE funcionarios
      ADD COLUMN area_atuacao enum('portaria','limpeza','manutencao','administrativo','outro')
      COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'outro' AFTER condominio_id
    `);
  }

  if (!(await hasColumn("convites_ativacao", "tipo_convite"))) {
    await pool.query(`
      ALTER TABLE convites_ativacao
      ADD COLUMN tipo_convite enum('morador','funcionario') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'morador' AFTER id
    `);
  }

  if (!(await hasColumn("convites_ativacao", "condominio_id"))) {
    await pool.query(`
      ALTER TABLE convites_ativacao
      ADD COLUMN condominio_id char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER usuario_id
    `);
  }

  if (!(await hasColumn("convites_ativacao", "funcionario_id"))) {
    await pool.query(`
      ALTER TABLE convites_ativacao
      ADD COLUMN funcionario_id char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER unidade_id
    `);
  }

  await pool.query(`
    ALTER TABLE convites_ativacao
    MODIFY COLUMN unidade_id char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL
  `);

  await pool.query(`
    UPDATE convites_ativacao conv
    LEFT JOIN unidades u ON u.id = conv.unidade_id
    SET conv.condominio_id = u.condominio_id
    WHERE conv.condominio_id IS NULL
      AND conv.unidade_id IS NOT NULL
  `);

  if (!(await hasIndex("convites_ativacao", "idx_convites_tipo"))) {
    await pool.query(`ALTER TABLE convites_ativacao ADD KEY idx_convites_tipo (tipo_convite)`);
  }

  if (!(await hasIndex("convites_ativacao", "idx_convites_condominio"))) {
    await pool.query(`ALTER TABLE convites_ativacao ADD KEY idx_convites_condominio (condominio_id)`);
  }

  if (!(await hasIndex("convites_ativacao", "idx_convites_funcionario"))) {
    await pool.query(`ALTER TABLE convites_ativacao ADD KEY idx_convites_funcionario (funcionario_id)`);
  }

  const [fkCondominio] = await pool.query(`
    SELECT CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'convites_ativacao'
      AND COLUMN_NAME = 'condominio_id'
      AND REFERENCED_TABLE_NAME IS NOT NULL
  `);

  if (!fkCondominio.length) {
    await pool.query(`
      ALTER TABLE convites_ativacao
      ADD CONSTRAINT fk_convites_condominio FOREIGN KEY (condominio_id) REFERENCES condominios (id) ON DELETE CASCADE
    `);
  }

  const [fkFuncionario] = await pool.query(`
    SELECT CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'convites_ativacao'
      AND COLUMN_NAME = 'funcionario_id'
      AND REFERENCED_TABLE_NAME IS NOT NULL
  `);

  if (!fkFuncionario.length) {
    await pool.query(`
      ALTER TABLE convites_ativacao
      ADD CONSTRAINT fk_convites_funcionario FOREIGN KEY (funcionario_id) REFERENCES funcionarios (id) ON DELETE CASCADE
    `);
  }

  const [result] = await pool.query(`SHOW COLUMNS FROM convites_ativacao`);
  const [resultFunc] = await pool.query(`SHOW COLUMNS FROM funcionarios`);

  console.log(JSON.stringify({
    convites_ativacao: result.map((row) => row.Field),
    funcionarios: resultFunc.map((row) => row.Field),
  }, null, 2));
} finally {
  await pool.end();
}
