import db from '../src/config/database.js';

async function createManutencoesOrdensServico() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS manutencoes_ordens_servico (
      id char(36) NOT NULL,
      condominio_id char(36) NOT NULL,
      ocorrencia_id char(36) DEFAULT NULL,
      area_comum_id char(36) DEFAULT NULL,
      torre_id char(36) DEFAULT NULL,
      unidade_id char(36) DEFAULT NULL,
      prestador_servico_id char(36) DEFAULT NULL,
      funcionario_responsavel_id char(36) DEFAULT NULL,
      criado_por_usuario_id char(36) NOT NULL,
      tipo_origem enum('preventiva','corretiva','reforma','derivada_ocorrencia','avulsa') NOT NULL DEFAULT 'corretiva',
      alvo_tipo enum('area_comum','torre','unidade','estrutura_geral') NOT NULL DEFAULT 'estrutura_geral',
      titulo varchar(180) NOT NULL,
      descricao_tecnica text NOT NULL,
      local_referencia varchar(180) DEFAULT NULL,
      prioridade enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
      status enum('aberta','planejada','em_execucao','aguardando_terceiro','concluida','cancelada') NOT NULL DEFAULT 'aberta',
      prazo_final_em datetime DEFAULT NULL,
      data_prevista datetime DEFAULT NULL,
      iniciada_em datetime DEFAULT NULL,
      concluida_em datetime DEFAULT NULL,
      custo_previsto decimal(12,2) DEFAULT NULL,
      custo_realizado decimal(12,2) DEFAULT NULL,
      bloqueia_area tinyint(1) NOT NULL DEFAULT 0,
      observacoes_internas text DEFAULT NULL,
      criado_em timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_manutencoes_os_condominio (condominio_id),
      KEY idx_manutencoes_os_ocorrencia (ocorrencia_id),
      KEY idx_manutencoes_os_area (area_comum_id),
      KEY idx_manutencoes_os_torre (torre_id),
      KEY idx_manutencoes_os_unidade (unidade_id),
      KEY idx_manutencoes_os_prestador (prestador_servico_id),
      KEY idx_manutencoes_os_funcionario (funcionario_responsavel_id),
      KEY idx_manutencoes_os_criado_por (criado_por_usuario_id),
      KEY idx_manutencoes_os_tipo_origem (tipo_origem),
      KEY idx_manutencoes_os_alvo_tipo (alvo_tipo),
      KEY idx_manutencoes_os_prioridade (prioridade),
      KEY idx_manutencoes_os_status (status),
      KEY idx_manutencoes_os_data_prevista (data_prevista),
      KEY idx_manutencoes_os_prazo_final (prazo_final_em),
      CONSTRAINT fk_manutencoes_os_condominio FOREIGN KEY (condominio_id) REFERENCES condominios (id) ON DELETE CASCADE,
      CONSTRAINT fk_manutencoes_os_ocorrencia FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias (id) ON DELETE SET NULL,
      CONSTRAINT fk_manutencoes_os_area FOREIGN KEY (area_comum_id) REFERENCES areas_comuns (id) ON DELETE SET NULL,
      CONSTRAINT fk_manutencoes_os_torre FOREIGN KEY (torre_id) REFERENCES torres (id) ON DELETE SET NULL,
      CONSTRAINT fk_manutencoes_os_unidade FOREIGN KEY (unidade_id) REFERENCES unidades (id) ON DELETE SET NULL,
      CONSTRAINT fk_manutencoes_os_prestador FOREIGN KEY (prestador_servico_id) REFERENCES prestadores_servico (id) ON DELETE SET NULL,
      CONSTRAINT fk_manutencoes_os_funcionario FOREIGN KEY (funcionario_responsavel_id) REFERENCES funcionarios (id) ON DELETE SET NULL,
      CONSTRAINT fk_manutencoes_os_criado_por FOREIGN KEY (criado_por_usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function createManutencoesEventos() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS manutencoes_eventos (
      id char(36) NOT NULL,
      ordem_servico_id char(36) NOT NULL,
      condominio_id char(36) NOT NULL,
      usuario_id char(36) NOT NULL,
      funcionario_id char(36) DEFAULT NULL,
      tipo_evento enum('abertura','planejamento','atribuicao','inicio_execucao','observacao','pausa','encaminhamento_terceiro','reagendamento','conclusao','cancelamento','reclassificacao') NOT NULL,
      status_resultante enum('aberta','planejada','em_execucao','aguardando_terceiro','concluida','cancelada') DEFAULT NULL,
      descricao_evento text DEFAULT NULL,
      custo_informado decimal(12,2) DEFAULT NULL,
      criado_em timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_manutencoes_eventos_ordem (ordem_servico_id),
      KEY idx_manutencoes_eventos_condominio (condominio_id),
      KEY idx_manutencoes_eventos_usuario (usuario_id),
      KEY idx_manutencoes_eventos_funcionario (funcionario_id),
      KEY idx_manutencoes_eventos_tipo (tipo_evento),
      KEY idx_manutencoes_eventos_status (status_resultante),
      KEY idx_manutencoes_eventos_criado_em (criado_em),
      CONSTRAINT fk_manutencoes_eventos_ordem FOREIGN KEY (ordem_servico_id) REFERENCES manutencoes_ordens_servico (id) ON DELETE CASCADE,
      CONSTRAINT fk_manutencoes_eventos_condominio FOREIGN KEY (condominio_id) REFERENCES condominios (id) ON DELETE CASCADE,
      CONSTRAINT fk_manutencoes_eventos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
      CONSTRAINT fk_manutencoes_eventos_funcionario FOREIGN KEY (funcionario_id) REFERENCES funcionarios (id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function run() {
  try {
    await createManutencoesOrdensServico();
    console.log('+ tabela manutencoes_ordens_servico pronta');
    await createManutencoesEventos();
    console.log('+ tabela manutencoes_eventos pronta');
    process.exit(0);
  } catch (error) {
    console.error('Erro na migracao de manutencoes fase 1:', error);
    process.exit(1);
  }
}

run();
