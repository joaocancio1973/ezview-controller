# Modulo: Condominios

## Objetivo

Permitir que cada `admin` gerencie os condominios do proprio contexto.

## Tabelas relacionadas

- `condominios`
- `admins`
- `usuarios`

## Fluxos atuais

- criar condominio
- listar condominios do admin logado
- autopreencher endereco no frontend a partir do `CEP` com `ViaCEP`
- exibir de forma sutil o consumo do limite de condominios do admin logado

## Regras importantes

- o vinculo oficial e `condominios.admin_id -> usuarios.id`
- o admin nao deve enxergar condominios de outros admins
- o `cnpj` deve ser persistido sem mascara, apenas com `14` digitos
- a API deve impedir duplicidade logica de `cnpj`, inclusive contra registros legados com pontuacao
- o frontend consulta `ViaCEP` ao completar um `CEP` valido e preenche `endereco`, `bairro`, `cidade` e `estado`
- o cabecalho da tela de condominios mostra `usados` e `restantes` em relacao ao limite do admin
