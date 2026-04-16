import {
  createVeiculoService,
  getVeiculoByIdService,
  listVeiculosService,
  listVeiculoMarcasService,
  listVeiculoModeloAnosService,
  listVeiculoModelosService,
  updateVeiculoService,
} from "../services/veiculos.service.js";

export async function getVeiculos(req, res) {
  try {
    const veiculos = await listVeiculosService(req.user.id, req.query);
    return res.json({ veiculos });
  } catch (error) {
    console.error("Erro ao listar veiculos:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao listar veiculos",
    });
  }
}

export async function createVeiculo(req, res) {
  try {
    const veiculo = await createVeiculoService(req.user.id, req.body);
    return res.status(201).json({
      mensagem: "Veiculo criado com sucesso",
      veiculo,
    });
  } catch (error) {
    console.error("Erro ao criar veiculo:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao criar veiculo",
    });
  }
}

export async function getVeiculoById(req, res) {
  try {
    const veiculo = await getVeiculoByIdService(req.user.id, req.params.id);
    return res.json({ veiculo });
  } catch (error) {
    console.error("Erro ao consultar veiculo:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao consultar veiculo",
    });
  }
}

export async function updateVeiculo(req, res) {
  try {
    const veiculo = await updateVeiculoService(req.user.id, req.params.id, req.body);
    return res.json({
      mensagem: "Veiculo atualizado com sucesso",
      veiculo,
    });
  } catch (error) {
    console.error("Erro ao atualizar veiculo:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao atualizar veiculo",
    });
  }
}

export async function getVeiculoMarcas(req, res) {
  try {
    const marcas = await listVeiculoMarcasService(req.query.tipo);
    return res.json({ marcas });
  } catch (error) {
    console.error("Erro ao listar marcas de veiculos:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao listar marcas de veiculos",
    });
  }
}

export async function getVeiculoModelos(req, res) {
  try {
    const modelos = await listVeiculoModelosService(req.query.marca_id);
    return res.json({ modelos });
  } catch (error) {
    console.error("Erro ao listar modelos de veiculos:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao listar modelos de veiculos",
    });
  }
}

export async function getVeiculoModeloAnos(req, res) {
  try {
    const anos = await listVeiculoModeloAnosService(req.query.modelo_id);
    return res.json({ anos });
  } catch (error) {
    console.error("Erro ao listar anos do modelo:", error);
    return res.status(error.status || 500).json({
      erro: error.message || "Erro ao listar anos do modelo",
    });
  }
}
