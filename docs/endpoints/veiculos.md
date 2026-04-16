# Endpoints - Veiculos

## Objetivo

Documentar o dominio de veiculos do condominio.

## Endpoints implementados - catalogo e operacao inicial

### `GET /veiculos`

Lista veiculos no escopo do `admin`.

Filtros suportados:

- `condominio_id`
- `unidade_id`
- `usuario_id`
- `placa`
- `status`

Permissao:

- `admin`

### `POST /veiculos`

Cria um veiculo vinculado a uma unidade e a um usuario.

Permissao:

- `admin`

Payload esperado:

```json
{
  "condominio_id": "uuid",
  "unidade_id": "uuid",
  "usuario_id": "uuid",
  "vaga_id": "uuid-ou-null",
  "placa": "ABC1D23",
  "tipo": "carro",
  "marca_id": "uuid",
  "modelo_id": "uuid",
  "modelo_ano_id": "uuid",
  "cor": "Prata",
  "observacoes": "Uso residencial",
  "modo_acesso_preferencial": "ambos",
  "principal": true
}
```

### `GET /veiculos/:id`

Carrega o detalhe de um veiculo no escopo do `admin`, inclusive os ids de catalogo necessarios para reabrir o formulario em modo de edicao.

Permissao:

- `admin`

### `PUT /veiculos/:id`

Atualiza um veiculo existente, incluindo troca de vaga, unidade, morador, catalogo do veiculo, status e definicao de principal.

Permissao:

- `admin`

### `GET /veiculos/catalogo/marcas`

Lista marcas por `tipo`.

Permissao:

- `admin`

### `GET /veiculos/catalogo/modelos`

Lista modelos por `marca_id`.

Permissao:

- `admin`

### `GET /veiculos/catalogo/anos`

Lista anos por `modelo_id`.

Permissao:

- `admin`

## Endpoints previstos - proxima fase

### `POST /veiculos/:id/regenerar-qrcode`

Regenera o token do QR Code do veiculo.

### `GET /veiculos/validar-placa`

Consulta rapida por placa para operacao futura de portaria.

### `GET /veiculos/validar-qrcode`

Valida token do QR Code do veiculo.

