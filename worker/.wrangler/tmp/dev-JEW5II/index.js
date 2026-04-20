var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-IYTOGH/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// src/index.ts
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  // Adjust in production to specific origins
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
var rateLimits = /* @__PURE__ */ new Map();
var MAX_REQUESTS_PER_DAY = 30;
function getClientIP(request) {
  return request.headers.get("cf-connecting-ip") || "unknown";
}
__name(getClientIP, "getClientIP");
function checkRateLimit(ip) {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
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
__name(checkRateLimit, "checkRateLimit");
async function callGemini(env, payload) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }
  return await response.json();
}
__name(callGemini, "callGemini");
var FEYNMAN_SYSTEM_PROMPT = `Ets un nen de 5 anys molt curi\xF3s per\xF2 molt intel\xB7ligent. El teu objectiu \xE9s ajudar l'usuari a entendre conceptes fent que te'ls expliqui de la forma m\xE9s simple possible, sense argot t\xE8cnic.

REGLES ESTRICTES:
1. Actua SEMPRE com un nen curi\xF3s en catal\xE0. Fes servir frases curtes i directes.
2. DETECCI\xD3 D'ARGOT: Si l'usuari fa servir paraules massa t\xE8cniques (com "mitocondri", "ATP", "algorisme", "polimorfisme", etc.) sense explicar-les primer amb una analogia, atura'l. Digues-li que no ho entens i demana-li una comparaci\xF3 (una analogia o met\xE0fora) amb coses del dia a dia. Aquesta \xE9s la "il\xB7lusi\xF3 de compet\xE8ncia".
3. RESPOSTES CURTES: Si la resposta de l'usuari \xE9s molt curta o poc detallada, demana-li m\xE9s detalls ("Com funciona aix\xF2 pas a pas?", "Per qu\xE8 passa aix\xF2?").
4. INTERROGACI\xD3 ELABORATIVA: Fes preguntes per aprofundir (ex: "I aix\xF2 en qu\xE8 es diferencia de X?", "Hi ha alguna excepci\xF3?").
5. VALIDACI\xD3: Quan l'explicaci\xF3 sigui molt simple, clara, sense argot i amb una bona analogia, digues-li "Ara ho entenc perfectament! Gr\xE0cies per explicar-m'ho." i dona per tancat el tema.
6. Mai li donis la resposta directament. Guia'l perqu\xE8 ell mateix la trobi.`;
var src_default = {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return new Response("OK", { headers: CORS_HEADERS });
    }
    const ip = getClientIP(request);
    const { allowed, remaining } = checkRateLimit(ip);
    if (!allowed) {
      return new Response("Rate limit exceeded. Try again tomorrow.", {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "Retry-After": "86400",
          "X-RateLimit-Remaining": "0"
        }
      });
    }
    const defaultHeaders = {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "X-RateLimit-Remaining": remaining.toString()
    };
    try {
      if (url.pathname === "/feynman" && request.method === "POST") {
        const body = await request.json();
        const payload = {
          system_instruction: {
            parts: [{ text: FEYNMAN_SYSTEM_PROMPT }]
          },
          contents: body.messages.map((m) => ({
            role: m.role,
            parts: [{ text: m.text }]
          }))
        };
        const geminiResponse = await callGemini(env, payload);
        const reply = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "No ho entenc, m'ho pots explicar d'una altra manera?";
        return new Response(JSON.stringify({ reply }), { headers: defaultHeaders });
      }
      if (url.pathname === "/generate-cards" && request.method === "POST") {
        const body = await request.json();
        const prompt = `Ets un expert creador de flashcards. A partir del seg\xFCent text, genera exactament ${body.count} flashcards en ${body.language === "ca" ? "catal\xE0" : "castell\xE0"}.
El format ha de ser un JSON array valid de l'estil: [{"q": "Pregunta", "a": "Resposta curtes i clares"}].
No incloguis markdown, nom\xE9s el JSON brut.

Text:
${body.text}`;
        const payload = {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        };
        const geminiResponse = await callGemini(env, payload);
        const replyText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        let cards = [];
        try {
          cards = JSON.parse(replyText);
        } catch (e) {
          console.error("Failed to parse JSON cards", replyText);
        }
        return new Response(JSON.stringify(cards), { headers: defaultHeaders });
      }
      if (url.pathname === "/exam-generate" && request.method === "POST") {
        const body = await request.json();
        const formatInstructions = body.type === "test" ? `[{"id": "1", "q": "Pregunta", "options": ["A", "B", "C", "D"], "correctAnswer": "A"}]` : body.type === "tf" ? `[{"id": "1", "q": "Afirmaci\xF3", "correctAnswer": "Cert"}] (o Fals)` : body.type === "practical" ? `[{"id": "1", "q": "Enunciat del problema pr\xE0ctic amb dades num\xE8riques o context necessari", "correctAnswer": "Resoluci\xF3 pas a pas amb el resultat final"}]` : `[{"id": "1", "q": "Pregunta oberta", "correctAnswer": "Resposta ideal"}]`;
        const practicalExtra = body.type === "practical" ? `
IMPORTANT: Crea problemes PR\xC0CTICS que requereixen c\xE0lculs, resoluci\xF3 d'exercicis, o aplicaci\xF3 de f\xF3rmules. Inclou dades num\xE8riques concretes a cada problema. La resposta ha d'incloure el procediment pas a pas i el resultat final.` : "";
        const prompt = `Ets un professor expert. Crea un examen tipus ${body.type === "practical" ? "pr\xE0ctic (exercicis i problemes)" : body.type} sobre el tema: "${body.topic}".
Genera exactament ${body.count} preguntes en ${body.language === "ca" ? "catal\xE0" : "castell\xE0"}.${practicalExtra}
El format ha de ser EXACTAMENT aquest JSON array: ${formatInstructions}. Totes les IDs han de ser \xFAniques (ex: "1", "2", ...).
Nom\xE9s JSON brut, cap explicaci\xF3.`;
        const payload = {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        };
        const geminiResponse = await callGemini(env, payload);
        const replyText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        let questions = [];
        try {
          questions = JSON.parse(replyText);
        } catch (e) {
          console.error("Parse error", replyText);
        }
        return new Response(JSON.stringify(questions), { headers: defaultHeaders });
      }
      if (url.pathname === "/exam-correct" && request.method === "POST") {
        const body = await request.json();
        const prompt = `Ets un professor corregint un examen de resposta oberta en ${body.language === "ca" ? "catal\xE0" : "castell\xE0"}.
T'adjunto l'examen amb la resposta ideal ("correctAnswer") i la resposta de l'alumne ("userAnswer").
Retorna EXACTAMENT un JSON array on cada element t\xE9:
{"id": "la mateixa id de la pregunta", "isCorrect": true/false (true si \xE9s acceptable, false si no), "feedback": "Breu correcci\xF3 de 1 o 2 frases."}
Nom\xE9s JSON brut.

Examen a corregir:
${JSON.stringify(body.questions, null, 2)}`;
        const payload = {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        };
        const geminiResponse = await callGemini(env, payload);
        const replyText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        let corrections = [];
        try {
          corrections = JSON.parse(replyText);
        } catch (e) {
          console.error("Parse error", replyText);
        }
        return new Response(JSON.stringify(corrections), { headers: defaultHeaders });
      }
      if (url.pathname === "/exam-correct-upload" && request.method === "POST") {
        const body = await request.json();
        const systemPrompt = `Ets un professor expert corregint un examen en ${body.language === "ca" ? "catal\xE0" : "castell\xE0"}.
L'alumne t'envia el seu examen (pot ser text, una foto o un PDF) amb les preguntes i les seves respostes.
Analitza cada pregunta i resposta que trobis, i retorna EXACTAMENT un JSON array on cada element t\xE9:
{"question": "la pregunta original", "userAnswer": "la resposta de l'alumne", "isCorrect": true/false, "feedback": "explicaci\xF3 breu de 1-2 frases sobre per qu\xE8 \xE9s correcte o incorrecte", "idealAnswer": "la resposta correcta completa"}

IMPORTANT:
- Si la resposta de l'alumne \xE9s parcialment correcta, marca-la com a incorrecta i explica qu\xE8 falta.
- Si l'examen \xE9s una imatge o PDF, llegeix el contingut i identifica les preguntes i respostes.
- Retorna NOM\xC9S el JSON array, cap text addicional.`;
        const parts = [{ text: systemPrompt }];
        if (body.fileData && body.mimeType) {
          parts.push({
            inlineData: {
              mimeType: body.mimeType,
              data: body.fileData
            }
          });
          parts.push({ text: "Corregeix l'examen que apareix en aquesta imatge/document." });
        } else if (body.examText) {
          parts.push({ text: `Text de l'examen:
${body.examText}` });
        }
        const payload = {
          contents: [{ role: "user", parts }],
          generationConfig: { responseMimeType: "application/json" }
        };
        const geminiResponse = await callGemini(env, payload);
        const replyText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        let results = [];
        try {
          results = JSON.parse(replyText);
        } catch (e) {
          console.error("Parse error", replyText);
        }
        return new Response(JSON.stringify(results), { headers: defaultHeaders });
      }
      return new Response("Not found", { status: 404, headers: CORS_HEADERS });
    } catch (error) {
      console.error(error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: defaultHeaders
      });
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-IYTOGH/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-IYTOGH/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
