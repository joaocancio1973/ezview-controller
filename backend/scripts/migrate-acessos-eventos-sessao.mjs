import db from "../src/config/database.js";

async function ensureColumn() {
  const [columns] = await db.query("SHOW COLUMNS FROM acessos_eventos LIKE 'funcionario_sessao_id'");
  if (!columns.length) {
    await db.query("ALTER TABLE acessos_eventos ADD COLUMN funcionario_sessao_id char(36) NULL AFTER funcionario_id");
    console.log("coluna funcionario_sessao_id criada em acessos_eventos");
  } else {
    console.log("coluna funcionario_sessao_id ja existe");
  }

  const [indexes] = await db.query("SHOW INDEX FROM acessos_eventos WHERE Key_name = 'idx_acessos_eventos_sessao'");
  if (!indexes.length) {
    await db.query("ALTER TABLE acessos_eventos ADD INDEX idx_acessos_eventos_sessao (funcionario_sessao_id)");
    console.log("indice idx_acessos_eventos_sessao criado");
  } else {
    console.log("indice idx_acessos_eventos_sessao ja existe");
  }

  const [fks] = await db.query(
    "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'acessos_eventos' AND COLUMN_NAME = 'funcionario_sessao_id' AND REFERENCED_TABLE_NAME = 'funcionarios_sessoes'"
  );

  if (!fks.length) {
    await db.query("ALTER TABLE acessos_eventos ADD CONSTRAINT fk_acessos_eventos_sessao FOREIGN KEY (funcionario_sessao_id) REFERENCES funcionarios_sessoes(id) ON DELETE SET NULL");
    console.log("fk_acessos_eventos_sessao criada");
  } else {
    console.log("fk_acessos_eventos_sessao ja existe");
  }
}

async function main() {
  try {
    await ensureColumn();
    console.log("Migracao de sessao operacional em acessos_eventos concluida.");
    process.exit(0);
  } catch (error) {
    console.error("Erro na migracao:", error);
    process.exit(1);
  }
}

main();
