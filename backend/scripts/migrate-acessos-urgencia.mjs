import db from "../src/config/database.js";

async function ensureUrgenteColumn() {
  const [rows] = await db.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'acessos_autorizacoes'
      AND COLUMN_NAME = 'urgente'
  `);

  if (!rows.length) {
    await db.query(`
      ALTER TABLE acessos_autorizacoes
      ADD COLUMN urgente TINYINT(1) NOT NULL DEFAULT 0 AFTER fim_previsto
    `);
    console.log('Coluna urgente criada em acessos_autorizacoes');
    return;
  }

  console.log('Coluna urgente ja existe em acessos_autorizacoes');
}

ensureUrgenteColumn()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erro ao aplicar migracao de urgencia em acessos:', error);
    process.exit(1);
  });
