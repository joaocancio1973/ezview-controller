import { v4 as uuidv4 } from "uuid";
import db from "../src/config/database.js";

const COBRANCA_STATUS_ENUM = "'rascunho','pendente','emitido','em_analise','pago','isento','cancelado','rejeitado','vencido'";
const COBRANCA_FORMA_ENUM = "'manual','boleto_futuro','boleto_api','pix_futuro','isento'";
const EVENTO_TIPO_ENUM = [
  "cobranca_criada",
  "reserva_sincronizada",
  "cobranca_emitida",
  "pagamento_sinalizado",
  "pagamento_confirmado",
  "pagamento_rejeitado",
  "cobranca_vencida",
  "isencao_aplicada",
  "cobranca_cancelada",
  "segunda_via_emitida",
  "valor_atualizado",
  "vencimento_atualizado",
  "observacao_atualizada",
  "webhook_recebido",
  "webhook_processado",
].map((item) => `'${item}'`).join(",");

async function hasTable(table) {
  const [rows] = await db.query(
    `
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = ?
    LIMIT 1
    `,
    [table],
  );

  return rows.length > 0;
}

async function hasColumn(table, column) {
  const [rows] = await db.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND column_name = ?
    LIMIT 1
    `,
    [table, column],
  );

  return rows.length > 0;
}

async function hasIndex(table, indexName) {
  const [rows] = await db.query(
    `
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND index_name = ?
    LIMIT 1
    `,
    [table, indexName],
  );

  return rows.length > 0;
}

async function hasConstraint(table, constraintName) {
  const [rows] = await db.query(
    `
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND constraint_name = ?
    LIMIT 1
    `,
    [table, constraintName],
  );

  return rows.length > 0;
}

async function getForeignKeyDeleteRule(table, constraintName) {
  const [rows] = await db.query(
    `
    SELECT rc.DELETE_RULE AS delete_rule
    FROM information_schema.referential_constraints rc
    WHERE rc.constraint_schema = DATABASE()
      AND rc.table_name = ?
      AND rc.constraint_name = ?
    LIMIT 1
    `,
    [table, constraintName],
  );

  return rows[0]?.delete_rule || null;
}

async function addIndexIfMissing(table, indexName, sql) {
  if (await hasIndex(table, indexName)) return;
  await db.query(sql);
}

async function addConstraintIfMissing(table, constraintName, sql) {
  if (await hasConstraint(table, constraintName)) return;
  await db.query(sql);
}

async function ensureFinanceiroGatewayContas() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS financeiro_gateway_contas (
      id CHAR(36) NOT NULL PRIMARY KEY,
      condominio_id CHAR(36) NOT NULL,
      gateway VARCHAR(40) NOT NULL,
      ambiente_gateway ENUM('sandbox','production') NOT NULL DEFAULT 'sandbox',
      gateway_account_id VARCHAR(80) NOT NULL,
      api_key_ref VARCHAR(120) NULL,
      status_operacional ENUM('pendente','em_analise','ativa','restrita','inativa') NOT NULL DEFAULT 'pendente',
      webhook_url_oficial VARCHAR(255) NULL,
      webhook_ativo TINYINT(1) NOT NULL DEFAULT 0,
      onboarding_concluido TINYINT(1) NOT NULL DEFAULT 0,
      observacao_interna TEXT NULL,
      criado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_financeiro_gateway_conta (gateway, ambiente_gateway, gateway_account_id),
      KEY idx_financeiro_gateway_conta_condominio (condominio_id),
      KEY idx_financeiro_gateway_conta_status (status_operacional),
      CONSTRAINT fk_financeiro_gateway_conta_condominio
        FOREIGN KEY (condominio_id) REFERENCES condominios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function ensureUnidadesResponsaveisFinanceiros() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS unidades_responsaveis_financeiros (
      id CHAR(36) NOT NULL PRIMARY KEY,
      condominio_id CHAR(36) NOT NULL,
      unidade_id CHAR(36) NOT NULL,
      usuario_id CHAR(36) NOT NULL,
      tipo_pagador ENUM('pf','pj') NOT NULL DEFAULT 'pf',
      nome_completo VARCHAR(160) NULL,
      cpf_cnpj VARCHAR(20) NULL,
      email VARCHAR(160) NULL,
      telefone_principal VARCHAR(30) NULL,
      telefone_whatsapp VARCHAR(30) NULL,
      cep VARCHAR(12) NULL,
      logradouro VARCHAR(160) NULL,
      numero VARCHAR(30) NULL,
      complemento VARCHAR(120) NULL,
      bairro VARCHAR(120) NULL,
      cidade VARCHAR(120) NULL,
      uf CHAR(2) NULL,
      ativo TINYINT(1) NOT NULL DEFAULT 1,
      ativo_para_cobranca TINYINT(1) NOT NULL DEFAULT 0,
      recebe_cobranca TINYINT(1) NOT NULL DEFAULT 0,
      preferencia_envio ENUM('email','inbox','email_e_inbox') NOT NULL DEFAULT 'email_e_inbox',
      ambiente_financeiro ENUM('teste','producao') NOT NULL DEFAULT 'teste',
      gateway_customer_id VARCHAR(80) NULL,
      gateway_conta_id CHAR(36) NULL,
      validado_em DATETIME NULL,
      validado_por CHAR(36) NULL,
      substitui_responsavel_id CHAR(36) NULL,
      observacao_financeira TEXT NULL,
      criado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      encerrado_em DATETIME NULL,
      KEY idx_urf_condominio (condominio_id),
      KEY idx_urf_unidade (unidade_id),
      KEY idx_urf_usuario (usuario_id),
      KEY idx_urf_gateway_conta (gateway_conta_id),
      KEY idx_urf_cpf_cnpj (cpf_cnpj),
      KEY idx_urf_ativo_unidade (unidade_id, ativo),
      KEY idx_urf_cobranca_unidade (unidade_id, ativo_para_cobranca, recebe_cobranca),
      KEY idx_urf_ambiente (ambiente_financeiro),
      CONSTRAINT fk_urf_condominio FOREIGN KEY (condominio_id) REFERENCES condominios(id) ON DELETE CASCADE,
      CONSTRAINT fk_urf_unidade FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE CASCADE,
      CONSTRAINT fk_urf_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
      CONSTRAINT fk_urf_gateway_conta FOREIGN KEY (gateway_conta_id) REFERENCES financeiro_gateway_contas(id) ON DELETE SET NULL,
      CONSTRAINT fk_urf_validado_por FOREIGN KEY (validado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
      CONSTRAINT fk_urf_substitui FOREIGN KEY (substitui_responsavel_id) REFERENCES unidades_responsaveis_financeiros(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function ensureFinanceiroWebhookLogs() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS financeiro_webhook_logs (
      id CHAR(36) NOT NULL PRIMARY KEY,
      condominio_id CHAR(36) NULL,
      gateway VARCHAR(40) NOT NULL,
      gateway_conta_id CHAR(36) NULL,
      gateway_evento VARCHAR(80) NOT NULL,
      gateway_charge_id VARCHAR(80) NULL,
      assinatura_recebida VARCHAR(255) NULL,
      payload_json JSON NOT NULL,
      hash_idempotencia VARCHAR(120) NULL,
      status_processamento ENUM('recebido','processado','ignorado','erro') NOT NULL DEFAULT 'recebido',
      erro_processamento TEXT NULL,
      recebido_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      processado_em DATETIME NULL,
      KEY idx_financeiro_webhook_gateway (gateway),
      KEY idx_financeiro_webhook_charge (gateway_charge_id),
      KEY idx_financeiro_webhook_status (status_processamento),
      KEY idx_financeiro_webhook_condominio (condominio_id),
      UNIQUE KEY uk_financeiro_webhook_hash (hash_idempotencia),
      CONSTRAINT fk_financeiro_webhook_condominio
        FOREIGN KEY (condominio_id) REFERENCES condominios(id) ON DELETE SET NULL,
      CONSTRAINT fk_financeiro_webhook_gateway_conta
        FOREIGN KEY (gateway_conta_id) REFERENCES financeiro_gateway_contas(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function ensureFinanceiroNotificacoes() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS financeiro_notificacoes (
      id CHAR(36) NOT NULL PRIMARY KEY,
      cobranca_id CHAR(36) NOT NULL,
      condominio_id CHAR(36) NOT NULL,
      responsavel_financeiro_id CHAR(36) NULL,
      canal ENUM('inbox','email','gateway') NOT NULL,
      status_envio ENUM('pendente','enviado','entregue','falhou') NOT NULL DEFAULT 'pendente',
      referencia_externa VARCHAR(120) NULL,
      detalhe_envio TEXT NULL,
      enviado_em DATETIME NULL,
      criado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_financeiro_notificacao_cobranca (cobranca_id),
      KEY idx_financeiro_notificacao_condominio (condominio_id),
      KEY idx_financeiro_notificacao_responsavel (responsavel_financeiro_id),
      KEY idx_financeiro_notificacao_canal_status (canal, status_envio),
      CONSTRAINT fk_financeiro_notificacao_cobranca
        FOREIGN KEY (cobranca_id) REFERENCES financeiro_cobrancas(id) ON DELETE CASCADE,
      CONSTRAINT fk_financeiro_notificacao_condominio
        FOREIGN KEY (condominio_id) REFERENCES condominios(id) ON DELETE CASCADE,
      CONSTRAINT fk_financeiro_notificacao_responsavel
        FOREIGN KEY (responsavel_financeiro_id) REFERENCES unidades_responsaveis_financeiros(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function ensureFinanceiroCobrancasStructure() {
  const alterStatements = [];

  if (!(await hasColumn("financeiro_cobrancas", "responsavel_financeiro_id"))) {
    alterStatements.push("ADD COLUMN responsavel_financeiro_id CHAR(36) NULL AFTER usuario_id");
  }
  if (!(await hasColumn("financeiro_cobrancas", "gateway"))) {
    alterStatements.push("ADD COLUMN gateway VARCHAR(40) NULL AFTER forma_cobranca");
  }
  if (!(await hasColumn("financeiro_cobrancas", "gateway_conta_id"))) {
    alterStatements.push("ADD COLUMN gateway_conta_id CHAR(36) NULL AFTER gateway");
  }
  if (!(await hasColumn("financeiro_cobrancas", "gateway_customer_id"))) {
    alterStatements.push("ADD COLUMN gateway_customer_id VARCHAR(80) NULL AFTER gateway_conta_id");
  }
  if (!(await hasColumn("financeiro_cobrancas", "gateway_charge_id"))) {
    alterStatements.push("ADD COLUMN gateway_charge_id VARCHAR(80) NULL AFTER gateway_customer_id");
  }
  if (!(await hasColumn("financeiro_cobrancas", "gateway_status"))) {
    alterStatements.push("ADD COLUMN gateway_status VARCHAR(60) NULL AFTER gateway_charge_id");
  }
  if (!(await hasColumn("financeiro_cobrancas", "billing_type"))) {
    alterStatements.push("ADD COLUMN billing_type VARCHAR(40) NULL AFTER gateway_status");
  }
  if (!(await hasColumn("financeiro_cobrancas", "external_reference"))) {
    alterStatements.push("ADD COLUMN external_reference VARCHAR(120) NULL AFTER billing_type");
  }
  if (!(await hasColumn("financeiro_cobrancas", "linha_digitavel"))) {
    alterStatements.push("ADD COLUMN linha_digitavel VARCHAR(120) NULL AFTER external_reference");
  }
  if (!(await hasColumn("financeiro_cobrancas", "barcode"))) {
    alterStatements.push("ADD COLUMN barcode VARCHAR(120) NULL AFTER linha_digitavel");
  }
  if (!(await hasColumn("financeiro_cobrancas", "boleto_url"))) {
    alterStatements.push("ADD COLUMN boleto_url TEXT NULL AFTER barcode");
  }
  if (!(await hasColumn("financeiro_cobrancas", "boleto_pdf_url"))) {
    alterStatements.push("ADD COLUMN boleto_pdf_url TEXT NULL AFTER boleto_url");
  }
  if (!(await hasColumn("financeiro_cobrancas", "nosso_numero"))) {
    alterStatements.push("ADD COLUMN nosso_numero VARCHAR(80) NULL AFTER boleto_pdf_url");
  }
  if (!(await hasColumn("financeiro_cobrancas", "multa_valor"))) {
    alterStatements.push("ADD COLUMN multa_valor DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER valor");
  }
  if (!(await hasColumn("financeiro_cobrancas", "juros_valor"))) {
    alterStatements.push("ADD COLUMN juros_valor DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER multa_valor");
  }
  if (!(await hasColumn("financeiro_cobrancas", "desconto_valor"))) {
    alterStatements.push("ADD COLUMN desconto_valor DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER juros_valor");
  }
  if (!(await hasColumn("financeiro_cobrancas", "paid_at"))) {
    alterStatements.push("ADD COLUMN paid_at DATETIME NULL AFTER pago_em");
  }
  if (!(await hasColumn("financeiro_cobrancas", "cancelled_at"))) {
    alterStatements.push("ADD COLUMN cancelled_at DATETIME NULL AFTER paid_at");
  }
  if (!(await hasColumn("financeiro_cobrancas", "ultima_sincronizacao_em"))) {
    alterStatements.push("ADD COLUMN ultima_sincronizacao_em DATETIME NULL AFTER cancelled_at");
  }
  if (!(await hasColumn("financeiro_cobrancas", "segunda_via_de_cobranca_id"))) {
    alterStatements.push("ADD COLUMN segunda_via_de_cobranca_id CHAR(36) NULL AFTER ultima_sincronizacao_em");
  }

  if (alterStatements.length) {
    await db.query(`ALTER TABLE financeiro_cobrancas ${alterStatements.join(", ")}`);
  }

  await db.query(`
    ALTER TABLE financeiro_cobrancas
    MODIFY COLUMN forma_cobranca ENUM(${COBRANCA_FORMA_ENUM}) NOT NULL DEFAULT 'manual',
    MODIFY COLUMN status ENUM(${COBRANCA_STATUS_ENUM}) NOT NULL DEFAULT 'pendente'
  `);

  if (await hasColumn("financeiro_cobrancas", "paid_at")) {
    await db.query(`
      UPDATE financeiro_cobrancas
      SET paid_at = COALESCE(paid_at, pago_em)
      WHERE pago_em IS NOT NULL
        AND paid_at IS NULL
    `);
  }

  await addIndexIfMissing(
    "financeiro_cobrancas",
    "idx_financeiro_cobranca_responsavel_financeiro",
    "CREATE INDEX idx_financeiro_cobranca_responsavel_financeiro ON financeiro_cobrancas(responsavel_financeiro_id)",
  );
  await addIndexIfMissing(
    "financeiro_cobrancas",
    "idx_financeiro_cobranca_gateway_conta",
    "CREATE INDEX idx_financeiro_cobranca_gateway_conta ON financeiro_cobrancas(gateway_conta_id)",
  );
  await addIndexIfMissing(
    "financeiro_cobrancas",
    "idx_financeiro_cobranca_gateway_charge",
    "CREATE INDEX idx_financeiro_cobranca_gateway_charge ON financeiro_cobrancas(gateway_charge_id)",
  );
  await addIndexIfMissing(
    "financeiro_cobrancas",
    "idx_financeiro_cobranca_gateway_status",
    "CREATE INDEX idx_financeiro_cobranca_gateway_status ON financeiro_cobrancas(gateway_status)",
  );
  await addIndexIfMissing(
    "financeiro_cobrancas",
    "idx_financeiro_cobranca_vencimento_status",
    "CREATE INDEX idx_financeiro_cobranca_vencimento_status ON financeiro_cobrancas(vencimento_em, status)",
  );
  await addIndexIfMissing(
    "financeiro_cobrancas",
    "idx_financeiro_cobranca_condominio_status",
    "CREATE INDEX idx_financeiro_cobranca_condominio_status ON financeiro_cobrancas(condominio_id, status)",
  );
  await addIndexIfMissing(
    "financeiro_cobrancas",
    "idx_financeiro_cobranca_unidade_status",
    "CREATE INDEX idx_financeiro_cobranca_unidade_status ON financeiro_cobrancas(unidade_id, status)",
  );
  await addIndexIfMissing(
    "financeiro_cobrancas",
    "idx_financeiro_cobranca_external_reference",
    "CREATE INDEX idx_financeiro_cobranca_external_reference ON financeiro_cobrancas(external_reference)",
  );
  await addIndexIfMissing(
    "financeiro_cobrancas",
    "idx_financeiro_cobranca_paid_at",
    "CREATE INDEX idx_financeiro_cobranca_paid_at ON financeiro_cobrancas(paid_at)",
  );
  await addIndexIfMissing(
    "financeiro_cobrancas",
    "uk_financeiro_cobranca_gateway_charge",
    "CREATE UNIQUE INDEX uk_financeiro_cobranca_gateway_charge ON financeiro_cobrancas(gateway, gateway_charge_id)",
  );
}

async function ensureFinanceiroEventosStructure() {
  await db.query(`
    ALTER TABLE financeiro_eventos
    MODIFY COLUMN tipo_evento ENUM(${EVENTO_TIPO_ENUM}) NOT NULL,
    MODIFY COLUMN status_anterior ENUM(${COBRANCA_STATUS_ENUM}) NULL,
    MODIFY COLUMN status_novo ENUM(${COBRANCA_STATUS_ENUM}) NULL
  `);
}

async function backfillResponsaveisFinanceiros() {
  if (!(await hasTable("financeiro_cobrancas"))) return;

  const hasPhoneWhatsapp = await hasColumn("usuarios", "phone_whatsapp");
  const hasDocumento = await hasColumn("usuarios", "documento_identificacao");

  const phoneExpr = hasPhoneWhatsapp ? "u.phone_whatsapp" : "NULL";
  const documentoExpr = hasDocumento ? "u.documento_identificacao" : "NULL";

  await db.query(`
    INSERT INTO unidades_responsaveis_financeiros (
      id,
      condominio_id,
      unidade_id,
      usuario_id,
      tipo_pagador,
      nome_completo,
      cpf_cnpj,
      email,
      telefone_principal,
      ativo,
      ativo_para_cobranca,
      recebe_cobranca,
      preferencia_envio,
      ambiente_financeiro,
      criado_em,
      atualizado_em
    )
    SELECT
      UUID(),
      base.condominio_id,
      base.unidade_id,
      base.usuario_id,
      'pf',
      u.nome_completo,
      ${documentoExpr},
      u.email,
      ${phoneExpr},
      1,
      0,
      0,
      'email_e_inbox',
      'teste',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM (
      SELECT DISTINCT condominio_id, unidade_id, usuario_id
      FROM financeiro_cobrancas
      WHERE unidade_id IS NOT NULL
        AND usuario_id IS NOT NULL
    ) base
    INNER JOIN usuarios u ON u.id = base.usuario_id
    LEFT JOIN unidades_responsaveis_financeiros urf
      ON urf.condominio_id = base.condominio_id
     AND urf.unidade_id = base.unidade_id
     AND urf.usuario_id = base.usuario_id
    WHERE urf.id IS NULL
  `);

  await db.query(`
    UPDATE unidades_responsaveis_financeiros
    SET ativo = 0
    WHERE unidade_id IN (
      SELECT unidade_id
      FROM (
        SELECT unidade_id
        FROM unidades_responsaveis_financeiros
        GROUP BY unidade_id
        HAVING SUM(CASE WHEN ativo = 1 THEN 1 ELSE 0 END) = 0
      ) sem_ativo
    )
  `);

  await db.query(`
    UPDATE unidades_responsaveis_financeiros urf
    INNER JOIN (
      SELECT
        base.unidade_id,
        COALESCE(
          (
            SELECT uu.usuario_id
            FROM unidade_usuarios uu
            WHERE uu.unidade_id = base.unidade_id
              AND uu.ativo = 1
            ORDER BY FIELD(uu.papel, 'titular', 'proprietario', 'dependente'), uu.criado_em ASC
            LIMIT 1
          ),
          (
            SELECT fc2.usuario_id
            FROM financeiro_cobrancas fc2
            WHERE fc2.unidade_id = base.unidade_id
              AND fc2.usuario_id IS NOT NULL
            ORDER BY COALESCE(fc2.atualizado_em, fc2.criado_em) DESC, fc2.criado_em DESC
            LIMIT 1
          )
        ) AS usuario_id_preferencial
      FROM (
        SELECT unidade_id
        FROM unidades_responsaveis_financeiros
        GROUP BY unidade_id
        HAVING SUM(CASE WHEN ativo = 1 THEN 1 ELSE 0 END) = 0
      ) base
    ) preferencial
      ON preferencial.unidade_id = urf.unidade_id
     AND preferencial.usuario_id_preferencial = urf.usuario_id
    SET urf.ativo = 1
    WHERE urf.ativo = 0
  `);

  await db.query(`
    UPDATE financeiro_cobrancas fc
    INNER JOIN unidades_responsaveis_financeiros urf
      ON urf.condominio_id = fc.condominio_id
     AND urf.unidade_id = fc.unidade_id
     AND urf.usuario_id = fc.usuario_id
    SET fc.responsavel_financeiro_id = urf.id
    WHERE fc.responsavel_financeiro_id IS NULL
  `);
}

async function ensureFinanceiroConstraints() {
  const usuarioDeleteRule = await getForeignKeyDeleteRule("financeiro_cobrancas", "fk_financeiro_cobranca_usuario");
  if (usuarioDeleteRule === "CASCADE") {
    await db.query(`
      ALTER TABLE financeiro_cobrancas
      DROP FOREIGN KEY fk_financeiro_cobranca_usuario
    `);

    await db.query(`
      ALTER TABLE financeiro_cobrancas
      ADD CONSTRAINT fk_financeiro_cobranca_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
    `);
  }

  await addConstraintIfMissing(
    "financeiro_cobrancas",
    "fk_financeiro_cobranca_responsavel_financeiro",
    `
    ALTER TABLE financeiro_cobrancas
    ADD CONSTRAINT fk_financeiro_cobranca_responsavel_financeiro
      FOREIGN KEY (responsavel_financeiro_id) REFERENCES unidades_responsaveis_financeiros(id) ON DELETE RESTRICT
    `,
  );

  await addConstraintIfMissing(
    "financeiro_cobrancas",
    "fk_financeiro_cobranca_gateway_conta",
    `
    ALTER TABLE financeiro_cobrancas
    ADD CONSTRAINT fk_financeiro_cobranca_gateway_conta
      FOREIGN KEY (gateway_conta_id) REFERENCES financeiro_gateway_contas(id) ON DELETE SET NULL
    `,
  );

  await addConstraintIfMissing(
    "financeiro_cobrancas",
    "fk_financeiro_cobranca_segunda_via",
    `
    ALTER TABLE financeiro_cobrancas
    ADD CONSTRAINT fk_financeiro_cobranca_segunda_via
      FOREIGN KEY (segunda_via_de_cobranca_id) REFERENCES financeiro_cobrancas(id) ON DELETE SET NULL
    `,
  );
}

async function run() {
  await ensureFinanceiroGatewayContas();
  console.log("+ tabela financeiro_gateway_contas pronta");

  await ensureUnidadesResponsaveisFinanceiros();
  console.log("+ tabela unidades_responsaveis_financeiros pronta");

  await ensureFinanceiroCobrancasStructure();
  console.log("+ estrutura de financeiro_cobrancas ampliada");

  await ensureFinanceiroEventosStructure();
  console.log("+ estrutura de financeiro_eventos ampliada");

  await ensureFinanceiroWebhookLogs();
  console.log("+ tabela financeiro_webhook_logs pronta");

  await ensureFinanceiroNotificacoes();
  console.log("+ tabela financeiro_notificacoes pronta");

  await backfillResponsaveisFinanceiros();
  console.log("+ backfill de responsaveis financeiros concluido");

  await ensureFinanceiroConstraints();
  console.log("+ constraints complementares aplicadas");

  console.log("Migracao financeiro boletos fase 2 aplicada com sucesso.");
}

run()
  .catch((error) => {
    console.error("Erro ao aplicar migracao financeiro boletos fase 2:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });
