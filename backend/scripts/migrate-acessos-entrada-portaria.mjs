import db from '../src/config/database.js';

async function ensureColumn(tableName, columnName, ddl) {
  const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [columnName]);
  if (!rows.length) {
    await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${ddl}`);
    console.log(`+ coluna ${columnName} criada`);
  } else {
    console.log(`= coluna ${columnName} ja existe`);
  }
}

async function run() {
  try {
    await ensureColumn('acessos_autorizacoes', 'origem_solicitacao', "`origem_solicitacao` enum('morador','portaria','admin') NOT NULL DEFAULT 'morador' AFTER `solicitante_id`");
    await ensureColumn('acessos_autorizacoes', 'destino_tipo', "`destino_tipo` enum('unidade','administracao','area_comum','outro') NOT NULL DEFAULT 'unidade' AFTER `tipo_acesso`");
    await ensureColumn('acessos_autorizacoes', 'destino_descricao', "`destino_descricao` varchar(150) DEFAULT NULL AFTER `destino_tipo`");
    await ensureColumn('acessos_autorizacoes', 'contato_destino', "`contato_destino` varchar(150) DEFAULT NULL AFTER `destino_descricao`");
    await ensureColumn('acessos_autorizacoes', 'veiculo_descricao', "`veiculo_descricao` varchar(150) DEFAULT NULL AFTER `placa`");
    process.exit(0);
  } catch (error) {
    console.error('Erro na migracao de acesso espontaneo:', error);
    process.exit(1);
  }
}

run();
