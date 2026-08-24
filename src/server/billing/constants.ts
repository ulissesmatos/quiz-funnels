/**
 * Sem `server-only` de propósito — compartilhada entre servidor (calcula o
 * valor cobrado de verdade) e cliente (exibe o preço com desconto antes do
 * checkout). Nunca confie no cliente pra aplicar o desconto de verdade; ele
 * só usa isto pra mostrar o número certo.
 */
export const PIX_ANNUAL_DISCOUNT = 0.05;
