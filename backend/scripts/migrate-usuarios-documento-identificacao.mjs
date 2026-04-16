import db from "../src/config/database.js";

async function ensureDocumentoIdentificacao() {
  const [columns] = await db.query("SHOW COLUMNS FROM usuarios LIKE 'documento_identificacao'");
  if (columns.length) {
    console.log("Coluna documento_identificacao ja existe em usuarios.");
    return;
  }

  await db.query(`
    ALTER TABLE usuarios
    ADD COLUMN documento_identificacao VARCHAR(30) NULL AFTER phone_whatsapp
  `);

  console.log("Coluna documento_identificacao criada em usuarios.");
}

try {
  await ensureDocumentoIdentificacao();
} catch (error) {
  console.error("Erro ao migrar usuarios.documento_identificacao:", error);
  process.exitCode = 1;
} finally {
  await db.end();
}
