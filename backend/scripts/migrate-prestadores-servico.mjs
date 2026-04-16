import db from '../src/config/database.js';

async function createPrestadoresServico() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS prestadores_servico (
      id char(36) NOT NULL,
      condominio_id char(36) NOT NULL,
      nome_prestador varchar(150) NOT NULL,
      documento varchar(30) DEFAULT NULL,
      empresa varchar(150) DEFAULT NULL,
      telefone varchar(20) DEFAULT NULL,
      telefone_secundario varchar(20) DEFAULT NULL,
      whatsapp varchar(20) DEFAULT NULL,
      email varchar(150) DEFAULT NULL,
      placa varchar(10) DEFAULT NULL,
      veiculo_descricao varchar(150) DEFAULT NULL,
      responsavel_nome varchar(150) DEFAULT NULL,
      categoria_servico enum('energia_eletrica','agua_hidraulica','construcao_civil','internet_tv_rede','saude','personal','setor_comercial','automotivo','limpeza','manutencao_geral','entrega_tecnica','outro') NOT NULL,
      observacoes text DEFAULT NULL,
      contato_utilitario tinyint(1) NOT NULL DEFAULT 0,
      atende_24h tinyint(1) NOT NULL DEFAULT 0,
      status enum('ativo','inativo','bloqueado') NOT NULL DEFAULT 'ativo',
      ultimo_acesso_em datetime DEFAULT NULL,
      cadastrado_por_usuario_id char(36) NOT NULL,
      criado_em timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_prestadores_condominio (condominio_id),
      KEY idx_prestadores_categoria (categoria_servico),
      KEY idx_prestadores_status (status),
      KEY idx_prestadores_contato_utilitario (contato_utilitario),
      KEY idx_prestadores_placa (placa),
      KEY idx_prestadores_documento (documento),
      CONSTRAINT fk_prestadores_condominio FOREIGN KEY (condominio_id) REFERENCES condominios (id) ON DELETE CASCADE,
      CONSTRAINT fk_prestadores_cadastrado_por FOREIGN KEY (cadastrado_por_usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureColumn(tableName, columnName, ddl) {
  const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [columnName]);
  if (!rows.length) {
    await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${ddl}`);
    console.log(`+ coluna ${columnName} criada`);
  } else {
    console.log(`= coluna ${columnName} ja existe`);
  }
}

async function ensureForeignKey() {
  const [rows] = await db.query(`
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'acessos_autorizacoes'
      AND COLUMN_NAME = 'prestador_servico_id'
      AND REFERENCED_TABLE_NAME = 'prestadores_servico'
  `);
  if (!rows.length) {
    await db.query(`ALTER TABLE acessos_autorizacoes ADD CONSTRAINT fk_acessos_prestador_servico FOREIGN KEY (prestador_servico_id) REFERENCES prestadores_servico (id) ON DELETE SET NULL`);
    console.log('+ fk_acessos_prestador_servico criada');
  } else {
    console.log('= fk_acessos_prestador_servico ja existe');
  }
}

async function run() {
  try {
    await createPrestadoresServico();
    console.log('+ tabela prestadores_servico pronta');
    await ensureColumn('acessos_autorizacoes', 'prestador_servico_id', '`prestador_servico_id` char(36) NULL AFTER `colaborador_unidade_id`');
    await ensureForeignKey();
    process.exit(0);
  } catch (error) {
    console.error('Erro na migracao de prestadores_servico:', error);
    process.exit(1);
  }
}

run();
