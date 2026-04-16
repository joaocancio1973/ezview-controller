import db from '../src/config/database.js';

async function createManutencoesAnexos() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS manutencoes_anexos (
      id char(36) NOT NULL,
      ordem_servico_id char(36) NOT NULL,
      condominio_id char(36) NOT NULL,
      usuario_id char(36) NOT NULL,
      nome_original varchar(255) NOT NULL,
      nome_arquivo varchar(255) NOT NULL,
      mime_type varchar(120) NOT NULL,
      caminho_relativo varchar(255) NOT NULL,
      tamanho_bytes int NOT NULL,
      criado_em timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_manutencoes_anexos_ordem (ordem_servico_id),
      KEY idx_manutencoes_anexos_condominio (condominio_id),
      KEY idx_manutencoes_anexos_usuario (usuario_id),
      CONSTRAINT fk_manutencoes_anexos_ordem FOREIGN KEY (ordem_servico_id) REFERENCES manutencoes_ordens_servico (id) ON DELETE CASCADE,
      CONSTRAINT fk_manutencoes_anexos_condominio FOREIGN KEY (condominio_id) REFERENCES condominios (id) ON DELETE CASCADE,
      CONSTRAINT fk_manutencoes_anexos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function run() {
  try {
    await createManutencoesAnexos();
    console.log('+ tabela manutencoes_anexos pronta');
    process.exit(0);
  } catch (error) {
    console.error('Erro na migracao de anexos de manutencoes:', error);
    process.exit(1);
  }
}

run();
