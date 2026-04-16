import db from "../src/config/database.js";

async function hasColumn(table, column) {
  const [rows] = await db.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND column_name = ?
    LIMIT 1
    `,
    [table, column],
  );
  return rows.length > 0;
}

async function hasConstraint(name) {
  const [rows] = await db.query(
    `
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
      AND constraint_name = ?
    LIMIT 1
    `,
    [name],
  );
  return rows.length > 0;
}

try {
  await db.query(`
    CREATE TABLE IF NOT EXISTS inbox_visitantes_unidade (
      id CHAR(36) NOT NULL,
      condominio_id CHAR(36) NOT NULL,
      unidade_id CHAR(36) NOT NULL,
      nome_completo VARCHAR(150) NOT NULL,
      documento VARCHAR(30) DEFAULT NULL,
      telefone VARCHAR(20) DEFAULT NULL,
      parentesco_relacao VARCHAR(80) DEFAULT NULL,
      observacoes VARCHAR(255) DEFAULT NULL,
      status ENUM('ativo','inativo','bloqueado') NOT NULL DEFAULT 'ativo',
      foto_identificacao_url VARCHAR(255) DEFAULT NULL,
      cadastrado_por_usuario_id CHAR(36) NOT NULL,
      ultimo_acesso_em DATETIME DEFAULT NULL,
      criado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_inbox_condominio (condominio_id),
      KEY idx_inbox_unidade (unidade_id),
      KEY idx_inbox_status (status),
      KEY idx_inbox_nome (nome_completo),
      CONSTRAINT fk_inbox_condominio FOREIGN KEY (condominio_id) REFERENCES condominios (id) ON DELETE RESTRICT,
      CONSTRAINT fk_inbox_unidade FOREIGN KEY (unidade_id) REFERENCES unidades (id) ON DELETE RESTRICT,
      CONSTRAINT fk_inbox_usuario FOREIGN KEY (cadastrado_por_usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  if (!(await hasColumn("acessos_autorizacoes", "inbox_visitante_id"))) {
    await db.query(`
      ALTER TABLE acessos_autorizacoes
      ADD COLUMN inbox_visitante_id CHAR(36) NULL AFTER colaborador_unidade_id
    `);
  }

  if (!(await hasConstraint("fk_acessos_inbox_visitante"))) {
    await db.query(`
      ALTER TABLE acessos_autorizacoes
      ADD CONSTRAINT fk_acessos_inbox_visitante
      FOREIGN KEY (inbox_visitante_id) REFERENCES inbox_visitantes_unidade (id)
      ON DELETE SET NULL
    `);
  }

  console.log("Inbox da unidade pronto.");
} catch (error) {
  console.error("Erro ao migrar inbox da unidade:", error);
  process.exitCode = 1;
} finally {
  await db.end();
}
