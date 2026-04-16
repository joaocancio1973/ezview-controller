import db from '../src/config/database.js';

async function createOcorrencias() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ocorrencias (
      id char(36) NOT NULL,
      condominio_id char(36) NOT NULL,
      unidade_id char(36) DEFAULT NULL,
      aberto_por_usuario_id char(36) NOT NULL,
      funcionario_responsavel_id char(36) DEFAULT NULL,
      origem enum('morador','admin','funcionario') NOT NULL,
      categoria enum('eletrica','hidraulica','limpeza','seguranca','elevador','area_comum','portaria','obra_manutencao','administrativo','outro') NOT NULL,
      titulo varchar(160) NOT NULL,
      descricao text NOT NULL,
      local_referencia varchar(160) DEFAULT NULL,
      prioridade enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
      status enum('aberta','em_analise','em_atendimento','concluida','cancelada') NOT NULL DEFAULT 'aberta',
      aberta_em datetime NOT NULL,
      concluida_em datetime DEFAULT NULL,
      criado_em timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_ocorrencias_condominio (condominio_id),
      KEY idx_ocorrencias_unidade (unidade_id),
      KEY idx_ocorrencias_aberto_por (aberto_por_usuario_id),
      KEY idx_ocorrencias_funcionario_responsavel (funcionario_responsavel_id),
      KEY idx_ocorrencias_categoria (categoria),
      KEY idx_ocorrencias_prioridade (prioridade),
      KEY idx_ocorrencias_status (status),
      KEY idx_ocorrencias_aberta_em (aberta_em),
      CONSTRAINT fk_ocorrencias_condominio FOREIGN KEY (condominio_id) REFERENCES condominios (id) ON DELETE CASCADE,
      CONSTRAINT fk_ocorrencias_unidade FOREIGN KEY (unidade_id) REFERENCES unidades (id) ON DELETE SET NULL,
      CONSTRAINT fk_ocorrencias_aberto_por FOREIGN KEY (aberto_por_usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
      CONSTRAINT fk_ocorrencias_funcionario_responsavel FOREIGN KEY (funcionario_responsavel_id) REFERENCES funcionarios (id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function createOcorrenciasEventos() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ocorrencias_eventos (
      id char(36) NOT NULL,
      ocorrencia_id char(36) NOT NULL,
      condominio_id char(36) NOT NULL,
      usuario_id char(36) NOT NULL,
      funcionario_id char(36) DEFAULT NULL,
      tipo_evento enum('abertura','encaminhamento','analise','inicio_atendimento','observacao','conclusao','cancelamento','reclassificacao') NOT NULL,
      status_resultante enum('aberta','em_analise','em_atendimento','concluida','cancelada') DEFAULT NULL,
      descricao_evento text DEFAULT NULL,
      criado_em timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_ocorrencias_eventos_ocorrencia (ocorrencia_id),
      KEY idx_ocorrencias_eventos_condominio (condominio_id),
      KEY idx_ocorrencias_eventos_usuario (usuario_id),
      KEY idx_ocorrencias_eventos_funcionario (funcionario_id),
      KEY idx_ocorrencias_eventos_tipo (tipo_evento),
      KEY idx_ocorrencias_eventos_criado_em (criado_em),
      CONSTRAINT fk_ocorrencias_eventos_ocorrencia FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias (id) ON DELETE CASCADE,
      CONSTRAINT fk_ocorrencias_eventos_condominio FOREIGN KEY (condominio_id) REFERENCES condominios (id) ON DELETE CASCADE,
      CONSTRAINT fk_ocorrencias_eventos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
      CONSTRAINT fk_ocorrencias_eventos_funcionario FOREIGN KEY (funcionario_id) REFERENCES funcionarios (id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function run() {
  try {
    await createOcorrencias();
    console.log('+ tabela ocorrencias pronta');
    await createOcorrenciasEventos();
    console.log('+ tabela ocorrencias_eventos pronta');
    process.exit(0);
  } catch (error) {
    console.error('Erro na migracao de ocorrencias:', error);
    process.exit(1);
  }
}

run();
