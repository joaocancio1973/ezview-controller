import db from '../src/config/database.js';

async function createOcorrenciasAnexos() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ocorrencias_anexos (
      id char(36) NOT NULL,
      ocorrencia_id char(36) NOT NULL,
      condominio_id char(36) NOT NULL,
      usuario_id char(36) NOT NULL,
      nome_original varchar(255) NOT NULL,
      nome_arquivo varchar(255) NOT NULL,
      mime_type varchar(100) NOT NULL,
      caminho_relativo varchar(255) NOT NULL,
      tamanho_bytes int unsigned NOT NULL,
      criado_em timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_ocorrencias_anexos_ocorrencia (ocorrencia_id),
      KEY idx_ocorrencias_anexos_condominio (condominio_id),
      KEY idx_ocorrencias_anexos_usuario (usuario_id),
      CONSTRAINT fk_ocorrencias_anexos_ocorrencia FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias (id) ON DELETE CASCADE,
      CONSTRAINT fk_ocorrencias_anexos_condominio FOREIGN KEY (condominio_id) REFERENCES condominios (id) ON DELETE CASCADE,
      CONSTRAINT fk_ocorrencias_anexos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function run() {
  try {
    await createOcorrenciasAnexos();
    console.log('+ tabela ocorrencias_anexos pronta');
    process.exit(0);
  } catch (error) {
    console.error('Erro na migracao de anexos de ocorrencias:', error);
    process.exit(1);
  }
}

run();
