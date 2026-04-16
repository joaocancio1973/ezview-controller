import db from "../src/config/database.js";

async function run() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS financeiro_cobrancas (
      id CHAR(36) NOT NULL PRIMARY KEY,
      condominio_id CHAR(36) NOT NULL,
      unidade_id CHAR(36) NOT NULL,
      usuario_id CHAR(36) NOT NULL,
      reserva_id CHAR(36) NULL,
      lancamento_legado_id CHAR(36) NULL,
      origem ENUM('reserva','taxa_condominial','mensalidade','multa','avulso') NOT NULL DEFAULT 'avulso',
      forma_cobranca ENUM('manual','boleto_futuro','pix_futuro','isento') NOT NULL DEFAULT 'manual',
      referencia_titulo VARCHAR(160) NOT NULL,
      descricao TEXT NULL,
      valor DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      status ENUM('rascunho','pendente','em_analise','pago','isento','cancelado','rejeitado') NOT NULL DEFAULT 'pendente',
      vencimento_em DATETIME NULL,
      pago_em DATETIME NULL,
      confirmado_por CHAR(36) NULL,
      observacao_interna TEXT NULL,
      observacao_morador TEXT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_financeiro_cobranca_reserva (reserva_id),
      KEY idx_financeiro_cobranca_condominio (condominio_id),
      KEY idx_financeiro_cobranca_unidade (unidade_id),
      KEY idx_financeiro_cobranca_usuario (usuario_id),
      KEY idx_financeiro_cobranca_status (status),
      KEY idx_financeiro_cobranca_origem (origem),
      CONSTRAINT fk_financeiro_cobranca_condominio FOREIGN KEY (condominio_id) REFERENCES condominios(id) ON DELETE CASCADE,
      CONSTRAINT fk_financeiro_cobranca_unidade FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE CASCADE,
      CONSTRAINT fk_financeiro_cobranca_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      CONSTRAINT fk_financeiro_cobranca_reserva FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE SET NULL,
      CONSTRAINT fk_financeiro_cobranca_lancamento FOREIGN KEY (lancamento_legado_id) REFERENCES lancamentos_financeiros(id) ON DELETE SET NULL,
      CONSTRAINT fk_financeiro_cobranca_confirmado_por FOREIGN KEY (confirmado_por) REFERENCES usuarios(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS financeiro_eventos (
      id CHAR(36) NOT NULL PRIMARY KEY,
      cobranca_id CHAR(36) NOT NULL,
      condominio_id CHAR(36) NOT NULL,
      usuario_id CHAR(36) NULL,
      mensagem_id CHAR(36) NULL,
      origem_ator ENUM('sistema','admin','morador','funcionario') NOT NULL DEFAULT 'sistema',
      tipo_evento ENUM('cobranca_criada','reserva_sincronizada','pagamento_sinalizado','pagamento_confirmado','pagamento_rejeitado','isencao_aplicada','cobranca_cancelada','valor_atualizado','vencimento_atualizado','observacao_atualizada') NOT NULL,
      status_anterior ENUM('rascunho','pendente','em_analise','pago','isento','cancelado','rejeitado') NULL,
      status_novo ENUM('rascunho','pendente','em_analise','pago','isento','cancelado','rejeitado') NULL,
      descricao TEXT NULL,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_financeiro_eventos_cobranca (cobranca_id),
      KEY idx_financeiro_eventos_condominio (condominio_id),
      KEY idx_financeiro_eventos_usuario (usuario_id),
      CONSTRAINT fk_financeiro_evento_cobranca FOREIGN KEY (cobranca_id) REFERENCES financeiro_cobrancas(id) ON DELETE CASCADE,
      CONSTRAINT fk_financeiro_evento_condominio FOREIGN KEY (condominio_id) REFERENCES condominios(id) ON DELETE CASCADE,
      CONSTRAINT fk_financeiro_evento_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
      CONSTRAINT fk_financeiro_evento_mensagem FOREIGN KEY (mensagem_id) REFERENCES mensagens(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log("Migracao financeiro fase 1 aplicada com sucesso.");
}

run()
  .catch((error) => {
    console.error("Erro ao aplicar migracao financeira:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });
