/**
 * Piso de amostra abaixo do qual os números são estatisticamente pouco
 * confiáveis. Decide o estado "poucos dados" e se os botões de IA aparecem —
 * abaixo disso a explicação da IA seria só ruído, e a chamada nem é feita.
 */
export const MIN_SESSIONS_FOR_INSIGHTS = 10;
