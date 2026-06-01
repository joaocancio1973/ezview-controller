import db from "../src/config/database.js";

async function migrate() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS financeiro_anexos (
        id CHAR(36) PRIMARY KEY,
        cobranca_id CHAR(36) NOT NULL,
        condominio_id CHAR(36) NOT NULL,
        usuario_id CHAR(36) NOT NULL,
        nome_original VARCHAR(255) NOT NULL,
        nome_arquivo VARCHAR(255) NOT NULL,
        mime_type VARCHAR(120) NOT NULL,
        caminho_relativo VARCHAR(255) NOT NULL,
        tamanho_bytes INT UNSIGNED NOT NULL,
        categoria VARCHAR(40) NOT NULL DEFAULT 'comprovante',
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_financeiro_anexos_cobranca (cobranca_id),
        KEY idx_financeiro_anexos_condominio (condominio_id),
        KEY idx_financeiro_anexos_usuario (usuario_id),
        CONSTRAINT fk_financeiro_anexos_cobranca FOREIGN KEY (cobranca_id) REFERENCES financeiro_cobrancas (id) ON DELETE CASCADE,
        CONSTRAINT fk_financeiro_anexos_condominio FOREIGN KEY (condominio_id) REFERENCES condominios (id) ON DELETE CASCADE,
        CONSTRAINT fk_financeiro_anexos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log("+ tabela financeiro_anexos pronta");
  } catch (error) {
    console.error("Erro na migracao de anexos financeiros:", error);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

migrate();
