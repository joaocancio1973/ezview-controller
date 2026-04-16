import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 5,
  charset: "utf8mb4",
});

const catalogo = [
  {
    tipo: "carro",
    marcas: [
      {
        nome: "Chevrolet",
        codigo: "CHEVROLET",
        modelos: [
          { nome: "Onix", codigo: "ONIX", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "Onix Plus", codigo: "ONIX_PLUS", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "Tracker", codigo: "TRACKER", anos: [2021, 2022, 2023, 2024, 2025] },
        ],
      },
      {
        nome: "Fiat",
        codigo: "FIAT",
        modelos: [
          { nome: "Argo", codigo: "ARGO", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "Cronos", codigo: "CRONOS", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "Pulse", codigo: "PULSE", anos: [2022, 2023, 2024, 2025] },
        ],
      },
      {
        nome: "Ford",
        codigo: "FORD",
        modelos: [
          { nome: "Ka", codigo: "KA", anos: [2020, 2021] },
          { nome: "Ranger", codigo: "RANGER", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "Territory", codigo: "TERRITORY", anos: [2021, 2022, 2023, 2024, 2025] },
        ],
      },
      {
        nome: "Honda",
        codigo: "HONDA",
        modelos: [
          { nome: "City Sedan", codigo: "CITY_SEDAN", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "City Hatch", codigo: "CITY_HATCH", anos: [2022, 2023, 2024, 2025] },
          { nome: "HR-V", codigo: "HRV", anos: [2021, 2022, 2023, 2024, 2025] },
        ],
      },
      {
        nome: "Hyundai",
        codigo: "HYUNDAI",
        modelos: [
          { nome: "HB20", codigo: "HB20", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "HB20S", codigo: "HB20S", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "Creta", codigo: "CRETA", anos: [2021, 2022, 2023, 2024, 2025] },
        ],
      },
      {
        nome: "Jeep",
        codigo: "JEEP",
        modelos: [
          { nome: "Compass", codigo: "COMPASS", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "Renegade", codigo: "RENEGADE", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "Commander", codigo: "COMMANDER", anos: [2022, 2023, 2024, 2025] },
        ],
      },
      {
        nome: "Nissan",
        codigo: "NISSAN",
        modelos: [
          { nome: "Kicks", codigo: "KICKS", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "Versa", codigo: "VERSA", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "Sentra", codigo: "SENTRA", anos: [2023, 2024, 2025] },
        ],
      },
      {
        nome: "Renault",
        codigo: "RENAULT",
        modelos: [
          { nome: "Kwid", codigo: "KWID", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "Duster", codigo: "DUSTER", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "Oroch", codigo: "OROCH", anos: [2021, 2022, 2023, 2024, 2025] },
        ],
      },
      {
        nome: "Toyota",
        codigo: "TOYOTA",
        modelos: [
          { nome: "Corolla", codigo: "COROLLA", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "Corolla Cross", codigo: "COROLLA_CROSS", anos: [2022, 2023, 2024, 2025] },
          { nome: "Hilux", codigo: "HILUX", anos: [2021, 2022, 2023, 2024, 2025] },
        ],
      },
      {
        nome: "Volkswagen",
        codigo: "VOLKSWAGEN",
        modelos: [
          { nome: "Polo", codigo: "POLO", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "Virtus", codigo: "VIRTUS", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "T-Cross", codigo: "TCROSS", anos: [2021, 2022, 2023, 2024, 2025] },
        ],
      },
    ],
  },
  {
    tipo: "moto",
    marcas: [
      {
        nome: "Honda",
        codigo: "HONDA_MOTO",
        modelos: [
          { nome: "CG 160", codigo: "CG160", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "Biz 125", codigo: "BIZ125", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "PCX 160", codigo: "PCX160", anos: [2021, 2022, 2023, 2024, 2025] },
        ],
      },
      {
        nome: "Yamaha",
        codigo: "YAMAHA_MOTO",
        modelos: [
          { nome: "Factor 150", codigo: "FACTOR150", anos: [2021, 2022, 2023, 2024, 2025] },
          { nome: "Fazer FZ15", codigo: "FZ15", anos: [2022, 2023, 2024, 2025] },
          { nome: "NMAX 160", codigo: "NMAX160", anos: [2021, 2022, 2023, 2024, 2025] },
        ],
      },
    ],
  },
];

async function upsertMarca(connection, tipo, marca) {
  const [existingRows] = await connection.query(
    `
    SELECT id
    FROM veiculo_marcas
    WHERE tipo = ? AND nome = ?
    LIMIT 1
    `,
    [tipo, marca.nome],
  );

  if (existingRows.length) {
    await connection.query(
      `
      UPDATE veiculo_marcas
      SET codigo_referencia = ?, ativo = 1
      WHERE id = ?
      `,
      [marca.codigo, existingRows[0].id],
    );
    return existingRows[0].id;
  }

  const id = uuidv4();
  await connection.query(
    `
    INSERT INTO veiculo_marcas
      (id, tipo, nome, codigo_referencia, ativo)
    VALUES
      (?, ?, ?, ?, 1)
    `,
    [id, tipo, marca.nome, marca.codigo],
  );
  return id;
}

async function upsertModelo(connection, marcaId, modelo) {
  const [existingRows] = await connection.query(
    `
    SELECT id
    FROM veiculo_modelos
    WHERE marca_id = ? AND nome = ?
    LIMIT 1
    `,
    [marcaId, modelo.nome],
  );

  if (existingRows.length) {
    await connection.query(
      `
      UPDATE veiculo_modelos
      SET codigo_referencia = ?, ativo = 1
      WHERE id = ?
      `,
      [modelo.codigo, existingRows[0].id],
    );
    return existingRows[0].id;
  }

  const id = uuidv4();
  await connection.query(
    `
    INSERT INTO veiculo_modelos
      (id, marca_id, nome, codigo_referencia, ativo)
    VALUES
      (?, ?, ?, ?, 1)
    `,
    [id, marcaId, modelo.nome, modelo.codigo],
  );
  return id;
}

async function upsertAno(connection, modeloId, ano) {
  const [existingRows] = await connection.query(
    `
    SELECT id
    FROM veiculo_modelo_anos
    WHERE modelo_id = ? AND ano_modelo = ? AND combustivel = 'flex'
    LIMIT 1
    `,
    [modeloId, ano],
  );

  if (existingRows.length) {
    await connection.query(
      `
      UPDATE veiculo_modelo_anos
      SET ativo = 1, codigo_referencia = ?
      WHERE id = ?
      `,
      [`${ano}-FLEX`, existingRows[0].id],
    );
    return existingRows[0].id;
  }

  await connection.query(
    `
    INSERT INTO veiculo_modelo_anos
      (id, modelo_id, ano_modelo, combustivel, codigo_referencia, ativo)
    VALUES
      (?, ?, ?, 'flex', ?, 1)
    `,
    [uuidv4(), modeloId, ano, `${ano}-FLEX`],
  );
}

async function seed() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const grupo of catalogo) {
      for (const marca of grupo.marcas) {
        const marcaId = await upsertMarca(connection, grupo.tipo, marca);

        for (const modelo of marca.modelos) {
          const modeloId = await upsertModelo(connection, marcaId, modelo);

          for (const ano of modelo.anos) {
            await upsertAno(connection, modeloId, ano);
          }
        }
      }
    }

    await connection.commit();

    const [[marcas]] = await connection.query(
      "SELECT COUNT(*) AS total FROM veiculo_marcas WHERE ativo = 1",
    );
    const [[modelos]] = await connection.query(
      "SELECT COUNT(*) AS total FROM veiculo_modelos WHERE ativo = 1",
    );
    const [[anos]] = await connection.query(
      "SELECT COUNT(*) AS total FROM veiculo_modelo_anos WHERE ativo = 1",
    );

    console.log(
      JSON.stringify(
        {
          status: "ok",
          marcas: Number(marcas.total),
          modelos: Number(modelos.total),
          anos: Number(anos.total),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await connection.rollback();
    console.error(error);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

seed();
