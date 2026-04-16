import { v4 as uuidv4 } from "uuid";
import db from "../src/config/database.js";

const AREAS_BASE = [
  {
    nome: "Salao de Festa Principal",
    descricao:
      "Uso: eventos sociais e comemoracoes. Capacidade sugerida: 80 pessoas. Regras base: reserva obrigatoria, limpeza posterior e respeito ao horario limite do condominio.",
    exige_reserva: 1,
    exige_taxa: 1,
    valor_taxa: 2500.0,
    ativo: 1,
  },
  {
    nome: "Piscina Social",
    descricao:
      "Uso: lazer diario e encontros sociais. Capacidade sugerida: 40 pessoas. Regras base: reserva opcional para uso comum, obrigatoria para eventos exclusivos.",
    exige_reserva: 0,
    exige_taxa: 0,
    valor_taxa: null,
    ativo: 1,
  },
  {
    nome: "Area de Churrasqueira com Piscina Reservada",
    descricao:
      "Uso: confraternizacoes com apoio da piscina anexa. Capacidade sugerida: 25 pessoas. Regras base: reserva obrigatoria, controle de convidados e cuidado com equipamentos.",
    exige_reserva: 1,
    exige_taxa: 1,
    valor_taxa: 450.0,
    ativo: 1,
  },
  {
    nome: "Piscina Infantil com Parquinho Tematico",
    descricao:
      "Uso: lazer infantil supervisionado. Capacidade sugerida: 20 criancas acompanhadas. Regras base: reserva nao obrigatoria para uso comum, supervisao adulta recomendada.",
    exige_reserva: 0,
    exige_taxa: 0,
    valor_taxa: null,
    ativo: 1,
  },
  {
    nome: "Academia",
    descricao:
      "Uso: pratica de atividades fisicas. Capacidade sugerida: 18 pessoas. Regras base: reserva opcional por faixa de horario em momentos de alta demanda.",
    exige_reserva: 0,
    exige_taxa: 0,
    valor_taxa: null,
    ativo: 1,
  },
  {
    nome: "Auditorio",
    descricao:
      "Uso: palestras, assembleias e apresentacoes. Capacidade sugerida: 60 pessoas. Regras base: reserva obrigatoria para eventos formais e uso institucional.",
    exige_reserva: 1,
    exige_taxa: 1,
    valor_taxa: 320.0,
    ativo: 1,
  },
  {
    nome: "Quadra de Tenis 1",
    descricao:
      "Uso: pratica esportiva. Capacidade sugerida: 4 jogadores por reserva. Regras base: reserva recomendada por horario para evitar conflitos.",
    exige_reserva: 1,
    exige_taxa: 0,
    valor_taxa: null,
    ativo: 1,
  },
  {
    nome: "Quadra de Tenis 2",
    descricao:
      "Uso: pratica esportiva. Capacidade sugerida: 4 jogadores por reserva. Regras base: reserva recomendada por horario para evitar conflitos.",
    exige_reserva: 1,
    exige_taxa: 0,
    valor_taxa: null,
    ativo: 1,
  },
  {
    nome: "Quadra de Futebol",
    descricao:
      "Uso: partidas recreativas e treinos. Capacidade sugerida: 14 pessoas por reserva. Regras base: reserva por horario, controle de convidados e zelo com iluminacao.",
    exige_reserva: 1,
    exige_taxa: 0,
    valor_taxa: null,
    ativo: 1,
  },
  {
    nome: "Salao de Leitura e Videoconferencia",
    descricao:
      "Uso: estudo, reunioes e chamadas remotas. Capacidade sugerida: 16 pessoas. Regras base: reserva recomendada para uso exclusivo ou reunioes coletivas.",
    exige_reserva: 1,
    exige_taxa: 0,
    valor_taxa: null,
    ativo: 1,
  },
  {
    nome: "Brinquedoteca",
    descricao:
      "Uso: lazer infantil coberto. Capacidade sugerida: 18 criancas acompanhadas. Regras base: uso supervisionado e reserva opcional para atividades coletivas.",
    exige_reserva: 0,
    exige_taxa: 0,
    valor_taxa: null,
    ativo: 1,
  },
];

async function seedAreasComunsBase() {
  const [condominios] = await db.query(
    `
    SELECT id, nome_fantasia
    FROM condominios
    ORDER BY nome_fantasia ASC
    `,
  );

  let inseridas = 0;
  let existentes = 0;

  for (const condominio of condominios) {
    for (const area of AREAS_BASE) {
      const [rows] = await db.query(
        `
        SELECT id
        FROM areas_comuns
        WHERE condominio_id = ? AND nome = ?
        LIMIT 1
        `,
        [condominio.id, area.nome],
      );

      if (rows.length) {
        existentes += 1;
        continue;
      }

      await db.query(
        `
        INSERT INTO areas_comuns
          (id, condominio_id, nome, descricao, exige_reserva, exige_taxa, valor_taxa, ativo)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          uuidv4(),
          condominio.id,
          area.nome,
          area.descricao,
          area.exige_reserva,
          area.exige_taxa,
          area.valor_taxa,
          area.ativo,
        ],
      );

      inseridas += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        condominios_processados: condominios.length,
        areas_base_por_condominio: AREAS_BASE.length,
        inseridas,
        existentes,
      },
      null,
      2,
    ),
  );
}

try {
  await seedAreasComunsBase();
} finally {
  await db.end();
}
