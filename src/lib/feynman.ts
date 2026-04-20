import { JARGON_PATTERNS } from './jargon';

export interface FeynmanReply {
  text: string;
  nextLevel: number;
  xpGain: number;
}

/**
 * Pure analyzer of a student's Feynman response. Verbatim logic from Pro.
 * Returns the AI reply string, the new feynLevel, and XP awarded.
 */
export function analyzeFeynmanReply(params: {
  userText: string;
  topic: string;
  feynLevel: number;
}): FeynmanReply {
  const { userText, topic } = params;
  let { feynLevel } = params;
  const lower = userText.toLowerCase();

  const jargonFound = JARGON_PATTERNS.find((j) => lower.includes(j));
  const tooShort = userText.split(/\s+/).length < 12;
  const hasAnalogy =
    lower.includes('com si') ||
    lower.includes('imagina') ||
    lower.includes('per exemple') ||
    lower.includes('és com') ||
    lower.includes('seria com');
  const hasSteps =
    lower.includes('primer') ||
    lower.includes('després') ||
    lower.includes('finalment') ||
    lower.includes('pas ');
  const hasWhy =
    lower.includes('perquè') ||
    lower.includes('per què') ||
    lower.includes('la raó') ||
    lower.includes('causa');

  let xpGain = 0;
  let text = '';

  if (jargonFound) {
    text = `⚠️ <strong>ALERTA: Il·lusió de competència detectada!</strong>\n\nHas usat "<em>${jargonFound}</em>" — això és jerga tècnica. Usar paraules difícils no és el mateix que entendre-les.\n\n🎯 <strong>Repte:</strong> Explica el MATEIX concepte però imagina que ho expliques a la teva àvia. Usa una analogia de la vida quotidiana.\n\n<em>Tip: Les millors explicacions usen exemples com "és com quan..."</em>`;
    feynLevel = Math.max(0, feynLevel - 1);
  } else if (tooShort) {
    text = `Mmm, necessito més! 🤔\n\n<strong>La teva explicació és massa curta.</strong> Un concepte complex necessita:\n\n• <strong>Context:</strong> Per què existeix això?\n• <strong>Mecanisme:</strong> Com funciona pas a pas?\n• <strong>Exemple:</strong> On ho veiem a la vida real?\n\nProva de nou amb més detall!`;
  } else if (!hasAnalogy && feynLevel < 2) {
    const prompts = [
      `Entenc una mica... però no del tot 🤔\n\nPots posar-me un <strong>EXEMPLE</strong> o una <strong>ANALOGIA</strong>? Algo com "és com quan...".\n\nLes analogies connecten la info nova amb coses que ja saps. Són la clau del Feynman.`,
      `Bé, bé... però em costaria explicar-ho jo a un amic 🤔\n\nNecessito que m'ho facis <strong>visual</strong>. Imagina que ho has de dibuixar en una servilleta — com seria?\n\nUsa comparacions: "funciona igual que..."`,
    ];
    text = prompts[Math.floor(Math.random() * prompts.length)]!;
    feynLevel += 1;
    xpGain = 3;
  } else if (!hasWhy && Math.random() < 0.45) {
    const whys = [
      `Interessant! Però... <strong>¿PER QUÈ</strong> passa això? Quina és la causa de fons? 🔍`,
      `I si fos al revés, què passaria? <strong>¿Per què NO funciona d'una altra manera?</strong> 🔄`,
      `Molt bé! Ara la pregunta difícil: <strong>¿en què es DIFERENCIA d'un concepte similar?</strong> Quina és la distinció clau? ⚖️`,
      `M'encanta! Ara: <strong>¿quan NO funciona</strong> o quina és l'excepció? Tot té límits... 🎯`,
      `D'acord! Però... <strong>¿com connectes això amb ${topic.split(' ')[0]}?</strong> Fes el pont! 🌉`,
    ];
    text = whys[Math.floor(Math.random() * whys.length)]!;
    feynLevel += 1;
    xpGain = 5;
  } else {
    const bonus =
      hasAnalogy && hasSteps
        ? 'Has usat analogia I estructura pas a pas — IMPECABLE.'
        : hasAnalogy
          ? "L'analogia ha estat clau — facilita la comprensió."
          : 'Explicació clara i directa.';
    const praises = [
      `🎉 <strong>EXCEL·LENT!</strong> Ara sí que ho entenc!\n\n${bonus}\n\n✅ <strong>Feynman aprovat!</strong> Nivell de comprensió: <strong style="color:var(--ok)">ALT</strong>\n\nAquest concepte és teu. Vols provar amb un altre?`,
      `🌟 <strong>PERFECTE!</strong> L'has explicat genial.\n\nAixò és exactament el que Feynman demanava: si no ho pots explicar simple, no ho entens. Tu SÍ ho entens!\n\n✅ <strong>Tema dominat!</strong> +15 XP`,
      `🚀 <strong>IMPRESSIONANT!</strong>\n\n${bonus}\n\nNivell de comprensió: <strong style="color:var(--ok)">MESTRE</strong>\n\n✅ Concepte consolidat! Ara pots ensenyar-ho a qualsevol.`,
    ];
    text = praises[Math.floor(Math.random() * praises.length)]!;
    feynLevel = 3;
    xpGain = 15;
  }

  return { text, nextLevel: feynLevel, xpGain };
}
