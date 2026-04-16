import db from "../src/config/database.js";
import { syncFinanceiroReservaService } from "../src/services/financeiro.service.js";

async function run() {
  const [rows] = await db.query(
    `
    SELECT r.id
    FROM reservas r
    INNER JOIN areas_comuns a ON a.id = r.area_id
    WHERE a.exige_taxa = 1
    ORDER BY r.criado_em ASC
    `,
  );

  let total = 0;
  for (const row of rows) {
    await syncFinanceiroReservaService(row.id, {
      origemAtor: "sistema",
    });
    total += 1;
  }

  console.log(`Backfill financeiro concluido para ${total} reserva(s).`);
}

run()
  .catch((error) => {
    console.error("Erro no backfill financeiro:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });
