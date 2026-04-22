/**
 * Cloudflare Worker for StudyFlow Pro AI proxy
 */

export interface Env {
  GEMINI_API_KEY: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // Adjust in production to specific origins
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// In-memory rate limit (resets when worker restarts, but good enough for basic protection)
const rateLimits = new Map<string, { count: number; date: string }>();
const MAX_REQUESTS_PER_DAY = 50; // Increased from 30

function getClientIP(request: Request): string {
  return request.headers.get('cf-connecting-ip') || 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().split('T')[0]!;
  const current = rateLimits.get(ip);

  if (!current || current.date !== today) {
    rateLimits.set(ip, { count: 1, date: today });
    return { allowed: true, remaining: MAX_REQUESTS_PER_DAY - 1 };
  }

  if (current.count >= MAX_REQUESTS_PER_DAY) {
    return { allowed: false, remaining: 0 };
  }

  current.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS_PER_DAY - current.count };
}

async function callGemini(env: Env, payload: any) {
  // Using gemini-2.5-flash as gemini-1.5-flash is deprecated in this environment
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData: any = await response.json().catch(() => ({}));
    const message = errorData.error?.message || response.statusText;
    const code = errorData.error?.code || response.status;
    
    // Check for quota error
    if (code === 429) {
      throw new Error("Quota esgotada a l'API de Google. Torna-ho a provar més tard o canvia la clau d'API.");
    }
    
    throw new Error(`Gemini API error: ${code} - ${message}`);
  }

  return await response.json();
}

const FEYNMAN_SYSTEM_PROMPT = `Ets un nen de 5 anys molt curiós però molt intel·ligent. El teu objectiu és ajudar l'usuari a entendre conceptes fent que te'ls expliqui de la forma més simple possible, sense argot tècnic.

REGLES ESTRICTES:
1. Actua SEMPRE com un nen curiós en català. Fes servir frases curtes i directes.
2. DETECCIÓ D'ARGOT: Si l'usuari fa servir paraules massa tècniques (com "mitocondri", "ATP", "algorisme", "polimorfisme", etc.) sense explicar-les primer amb una analogia, atura'l. Digues-li que no ho entens i demana-li una comparació (una analogia o metàfora) amb coses del dia a dia. Aquesta és la "il·lusió de competència".
3. RESPOSTES CURTES: Si la resposta de l'usuari és molt curta o poc detallada, demana-li més detalls ("Com funciona això pas a pas?", "Per què passa això?").
4. INTERROGACIÓ ELABORATIVA: Fes preguntes per aprofundir (ex: "I això en què es diferencia de X?", "Hi ha alguna excepció?").
5. VALIDACIÓ: Quan l'explicació sigui molt simple, clara, sense argot i amb una bona analogia, digues-li "Ara ho entenc perfectament! Gràcies per explicar-m'ho." i dona per tancat el tema.
6. Mai li donis la resposta directament. Guia'l perquè ell mateix la trobi.`;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response('OK', { headers: CORS_HEADERS });
    }

    // Rate limiting
    const ip = getClientIP(request);
    const { allowed, remaining } = checkRateLimit(ip);
    
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again tomorrow.' }), {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Retry-After': '86400',
          'X-RateLimit-Remaining': '0',
        },
      });
    }

    const defaultHeaders = {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'X-RateLimit-Remaining': remaining.toString(),
    };

    try {
      if (url.pathname === '/feynman' && request.method === 'POST') {
        const body = await request.json() as { topic: string; messages: any[] };
        
        const payload = {
          system_instruction: {
            parts: [{ text: FEYNMAN_SYSTEM_PROMPT }]
          },
          contents: body.messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          }))
        };

        const geminiResponse: any = await callGemini(env, payload);
        const reply = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "No ho entenc, m'ho pots explicar d'una altra manera?";

        return new Response(JSON.stringify({ reply }), { headers: defaultHeaders });
      }

      if (url.pathname === '/generate-cards' && request.method === 'POST') {
        const body = await request.json() as { text?: string; fileData?: string; mimeType?: string; count: number; language: string };
        const prompt = `Ets un expert creador de flashcards. A partir de la informació proporcionada, genera exactament ${body.count} flashcards en ${body.language === 'ca' ? 'català' : 'castellà'}.
El format ha de ser un JSON array valid de l'estil: [{"q": "Pregunta", "a": "Resposta curtes i clares"}].
No incloguis markdown, només el JSON brut.`;

        const parts: any[] = [{ text: prompt }];

        if (body.fileData && body.mimeType) {
          parts.push({
            inlineData: { mimeType: body.mimeType, data: body.fileData }
          });
          parts.push({ text: "Analitza el document o imatge adjunta i extreu els conceptes clau en format de flashcards." });
        } else if (body.text) {
          parts.push({ text: `Text:\n${body.text}` });
        }

        const payload = {
          contents: [{ role: "user", parts }],
          generationConfig: { responseMimeType: "application/json" }
        };

        const geminiResponse: any = await callGemini(env, payload);
        const replyText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        let cards = [];
        try {
          cards = JSON.parse(replyText);
        } catch(e) {
          console.error("Failed to parse JSON cards", replyText);
        }

        return new Response(JSON.stringify(cards), { headers: defaultHeaders });
      }
      
      if (url.pathname === '/exam-generate' && request.method === 'POST') {
        const body = await request.json() as { topic: string; type: string; count: number; language: string };
        const formatInstructions = body.type === 'test' 
          ? `[{"id": "1", "q": "Pregunta", "options": ["A", "B", "C", "D"], "correctAnswer": "A"}]`
          : body.type === 'tf'
          ? `[{"id": "1", "q": "Afirmació", "correctAnswer": "Cert"}] (o Fals)`
          : body.type === 'practical'
          ? `[{"id": "1", "q": "Enunciat del problema pràctic amb dades numèriques o context necessari", "correctAnswer": "Resolució pas a pas amb el resultat final"}]`
          : `[{"id": "1", "q": "Pregunta oberta", "correctAnswer": "Resposta ideal"}]`;

        const practicalExtra = body.type === 'practical' 
          ? `\nIMPORTANT: Crea problemes PRÀCTICS que requereixen càlculs, resolució d'exercicis, o aplicació de fórmules. Inclou dades numèriques concretes a cada problema. La resposta ha d'incloure el procediment pas a pas i el resultat final.`
          : '';
          
        const prompt = `Ets un professor expert. Crea un examen tipus ${body.type === 'practical' ? 'pràctic (exercicis i problemes)' : body.type} sobre el tema: "${body.topic}".
Genera exactament ${body.count} preguntes en ${body.language === 'ca' ? 'català' : 'castellà'}.${practicalExtra}
El format ha de ser EXACTAMENT aquest JSON array: ${formatInstructions}. Totes les IDs han de ser úniques (ex: "1", "2", ...).
Només JSON brut, cap explicació.`;

        const payload = {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        };

        const geminiResponse: any = await callGemini(env, payload);
        const replyText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        let questions = [];
        try { questions = JSON.parse(replyText); } catch(e) { console.error("Parse error", replyText); }
        
        return new Response(JSON.stringify(questions), { headers: defaultHeaders });
      }

      if (url.pathname === '/exam-correct' && request.method === 'POST') {
        const body = await request.json() as { questions: any[]; language: string };
        const prompt = `Ets un professor corregint un examen de resposta oberta en ${body.language === 'ca' ? 'català' : 'castellà'}.
T'adjunto l'examen amb la resposta ideal ("correctAnswer") i la resposta de l'alumne ("userAnswer").
Retorna EXACTAMENT un JSON array on cada element té:
{"id": "la mateixa id de la pregunta", "isCorrect": true/false (true si és acceptable, false si no), "feedback": "Breu correcció de 1 o 2 frases."}
Només JSON brut.

Examen a corregir:
${JSON.stringify(body.questions, null, 2)}`;

        const payload = {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        };

        const geminiResponse: any = await callGemini(env, payload);
        const replyText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        let corrections = [];
        try { corrections = JSON.parse(replyText); } catch(e) { console.error("Parse error", replyText); }
        
        return new Response(JSON.stringify(corrections), { headers: defaultHeaders });
      }

      if (url.pathname === '/exam-correct-upload' && request.method === 'POST') {
        let body;
        try {
          body = await request.json() as { 
            examText?: string; 
            fileData?: string; 
            mimeType?: string; 
            language: string 
          };
        } catch (e) {
          return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), { status: 400, headers: defaultHeaders });
        }

        const systemPrompt = `Ets un professor expert corregint un examen en ${body.language === 'ca' ? 'català' : 'castellà'}.
L'alumne t'envia el seu examen (pot ser text, una foto o un PDF) amb les preguntes i les seves respostes.
Analitza cada pregunta i resposta que trobis, i retorna EXACTAMENT un JSON array on cada element té:
{"question": "la pregunta original", "userAnswer": "la resposta de l'alumne", "isCorrect": true/false, "feedback": "explicació breu de 1-2 frases sobre per què és correcte o incorrecte", "idealAnswer": "la resposta correcta completa"}

IMPORTANT:
- Si la resposta de l'alumne és parcialment correcta, marca-la com a incorrecta i explica què falta.
- Si l'examen és una imatge o PDF, llegeix el contingut i identifica les preguntes i respostes.
- Retorna NOMÉS el JSON array, cap text addicional.`;

        const parts: any[] = [];
        if (body.fileData && body.mimeType) {
          parts.push({
            inlineData: {
              mimeType: body.mimeType,
              data: body.fileData
            }
          });
          parts.push({ text: "Corregeix l'examen adjunt." });
        } else if (body.examText) {
          parts.push({ text: `Text de l'examen:\n${body.examText}` });
        } else {
          return new Response(JSON.stringify({ error: 'No exam content provided' }), { status: 400, headers: defaultHeaders });
        }

        const payload = {
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [{ role: "user", parts }],
          generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.1
          }
        };

        try {
          const geminiResponse: any = await callGemini(env, payload);
          const replyText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
          let results = [];
          try { 
            results = JSON.parse(replyText); 
          } catch(e) { 
            console.error("Parse error", replyText);
            // Fallback: try to find JSON in the text if it's not raw JSON
            const match = replyText.match(/\[[\s\S]*\]/);
            if (match) {
              results = JSON.parse(match[0]);
            } else {
              throw new Error("La IA ha retornat un format invàlid.");
            }
          }
          
          return new Response(JSON.stringify(results), { headers: defaultHeaders });
        } catch (error: any) {
          console.error("Gemini call failed:", error);
          return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: defaultHeaders 
          });
        }
      }

      return new Response(JSON.stringify({ error: 'Endpoint not found' }), { status: 404, headers: CORS_HEADERS });

    } catch (error: any) {
      console.error(error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: defaultHeaders,
      });
    }
  },
};
