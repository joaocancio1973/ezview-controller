import db from "../src/config/database.js";

async function ensureColaboradoresTable() {
  const [tables] = await db.query(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'colaboradores_unidade'
  `);

  if (!tables.length) {
    await db.query(`
      CREATE TABLE colaboradores_unidade (
        id CHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
        condominio_id CHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
        unidade_id CHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
        nome_completo VARCHAR(150) COLLATE utf8mb4_unicode_ci NOT NULL,
        documento VARCHAR(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        telefone VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        foto_identificacao_url VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        funcao ENUM('secretaria_lar','diarista','baba','cuidador','motorista','jardineiro','outro') COLLATE utf8mb4_unicode_ci NOT NULL,
        empresa VARCHAR(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
        observacoes TEXT COLLATE utf8mb4_unicode_ci,
        pode_autorizar_terceiros TINYINT(1) NOT NULL DEFAULT 0,
        status ENUM('ativo','inativo','bloqueado') COLLATE utf8mb4_unicode_ci DEFAULT 'ativo',
        cadastrado_por_usuario_id CHAR(36) COLLATE utf8mb4_unicode_ci NOT NULL,
        criado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_colab_condominio (condominio_id),
        KEY idx_colab_unidade (unidade_id),
        KEY idx_colab_documento (documento),
        KEY idx_colab_status (status),
        KEY idx_colab_cadastrado_por (cadastrado_por_usuario_id),
        CONSTRAINT fk_colab_condominio FOREIGN KEY (condominio_id) REFERENCES condominios (id) ON DELETE CASCADE,
        CONSTRAINT fk_colab_unidade FOREIGN KEY (unidade_id) REFERENCES unidades (id) ON DELETE CASCADE,
        CONSTRAINT fk_colab_cadastrado_por FOREIGN KEY (cadastrado_por_usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Tabela colaboradores_unidade criada');
  } else {
    console.log('Tabela colaboradores_unidade ja existe');
  }
}

async function ensureAcessosReference() {
  const [columns] = await db.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'acessos_autorizacoes'
      AND COLUMN_NAME = 'colaborador_unidade_id'
  `);

  if (!columns.length) {
    await db.query(`
      ALTER TABLE acessos_autorizacoes
      ADD COLUMN colaborador_unidade_id CHAR(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER unidade_id,
      ADD KEY idx_acessos_colaborador_unidade (colaborador_unidade_id),
      ADD CONSTRAINT fk_acessos_colaborador_unidade FOREIGN KEY (colaborador_unidade_id) REFERENCES colaboradores_unidade (id) ON DELETE SET NULL
    `);
    console.log('Referencia colaborador_unidade_id adicionada em acessos_autorizacoes');
  } else {
    console.log('Referencia colaborador_unidade_id ja existe em acessos_autorizacoes');
  }
}

await ensureColaboradoresTable();
await ensureAcessosReference();

const [createdTable] = await db.query(`SHOW CREATE TABLE colaboradores_unidade`);
console.log(createdTable[0]['Create Table']);
process.exit(0);
