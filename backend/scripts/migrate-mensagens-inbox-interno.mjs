import db from "../src/config/database.js";

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

async function run() {
  const alterMensagens = [];
  if (!(await hasColumn("mensagens", "categoria_evento"))) {
    alterMensagens.push("ADD COLUMN categoria_evento VARCHAR(80) NULL AFTER tipo");
  }
  if (!(await hasColumn("mensagens", "entidade_tipo"))) {
    alterMensagens.push("ADD COLUMN entidade_tipo VARCHAR(40) NULL AFTER categoria_evento");
  }
  if (!(await hasColumn("mensagens", "entidade_id"))) {
    alterMensagens.push("ADD COLUMN entidade_id CHAR(36) NULL AFTER entidade_tipo");
  }
  if (!(await hasColumn("mensagens", "mensagem_pai_id"))) {
    alterMensagens.push("ADD COLUMN mensagem_pai_id CHAR(36) NULL AFTER entidade_id");
  }
  if (!(await hasColumn("mensagens", "prioridade"))) {
    alterMensagens.push("ADD COLUMN prioridade ENUM('baixa','media','alta','urgente') NOT NULL DEFAULT 'media' AFTER conteudo");
  }
  if (!(await hasColumn("mensagens", "status"))) {
    alterMensagens.push("ADD COLUMN status ENUM('ativo','arquivado','cancelado') NOT NULL DEFAULT 'ativo' AFTER prioridade");
  }
  if (!(await hasColumn("mensagens", "acao_requerida"))) {
    alterMensagens.push("ADD COLUMN acao_requerida ENUM('nenhuma','ciencia','confirmar_pagamento','revisar','aprovar','responder') NOT NULL DEFAULT 'nenhuma' AFTER status");
  }
  if (!(await hasColumn("mensagens", "metadados_json"))) {
    alterMensagens.push("ADD COLUMN metadados_json LONGTEXT NULL AFTER acao_requerida");
  }
  if (!(await hasColumn("mensagens", "criado_por_tipo"))) {
    alterMensagens.push("ADD COLUMN criado_por_tipo ENUM('admin','morador','funcionario','sistema') NOT NULL DEFAULT 'sistema' AFTER remetente_id");
  }
  if (!(await hasColumn("mensagens", "atualizado_em"))) {
    alterMensagens.push("ADD COLUMN atualizado_em TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER criado_em");
  }

  if (alterMensagens.length) {
    await db.query(`ALTER TABLE mensagens ${alterMensagens.join(", ")}`);
  }

  const alterDestinatarios = [];
  if (!(await hasColumn("mensagem_destinatarios", "status_destinatario"))) {
    alterDestinatarios.push("ADD COLUMN status_destinatario ENUM('nao_lido','lido','acionado','resolvido','arquivado') NOT NULL DEFAULT 'nao_lido' AFTER usuario_id");
  }
  if (!(await hasColumn("mensagem_destinatarios", "acao_em"))) {
    alterDestinatarios.push("ADD COLUMN acao_em TIMESTAMP NULL DEFAULT NULL AFTER lido_em");
  }
  if (!(await hasColumn("mensagem_destinatarios", "arquivado"))) {
    alterDestinatarios.push("ADD COLUMN arquivado TINYINT(1) NOT NULL DEFAULT 0 AFTER acao_em");
  }
  if (!(await hasColumn("mensagem_destinatarios", "arquivado_em"))) {
    alterDestinatarios.push("ADD COLUMN arquivado_em TIMESTAMP NULL DEFAULT NULL AFTER arquivado");
  }
  if (!(await hasColumn("mensagem_destinatarios", "respondido_em"))) {
    alterDestinatarios.push("ADD COLUMN respondido_em TIMESTAMP NULL DEFAULT NULL AFTER arquivado_em");
  }

  if (alterDestinatarios.length) {
    await db.query(`ALTER TABLE mensagem_destinatarios ${alterDestinatarios.join(", ")}`);
  }

  console.log("Estrutura de mensagens evoluida para Inbox interno.");
}

try {
  await run();
} catch (error) {
  console.error("Erro ao migrar mensagens para inbox interno:", error);
  process.exitCode = 1;
} finally {
  await db.end();
}
