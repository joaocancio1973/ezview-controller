import db from '../src/config/database.js';
const [rows] = await db.query("SHOW COLUMNS FROM acessos_autorizacoes LIKE 'unidade_id'");
if (rows[0]?.Null !== 'YES') {
  await db.query("ALTER TABLE acessos_autorizacoes MODIFY unidade_id char(36) NULL");
  console.log('+ unidade_id agora aceita NULL');
} else {
  console.log('= unidade_id ja aceita NULL');
}
process.exit(0);
