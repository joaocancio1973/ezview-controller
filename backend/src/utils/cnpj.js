export function normalizeCnpj(value) {
  return String(value || "").replace(/\D/g, "");
}

export function isValidCnpj(value) {
  const cnpj = normalizeCnpj(value);

  if (cnpj.length !== 14) {
    return false;
  }

  return !/^(\d)\1{13}$/.test(cnpj);
}
