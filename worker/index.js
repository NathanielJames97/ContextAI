const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });
}

function utcDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === "/api/health") {
      return json({ status: "ok" });
    }

    const date = utcDate();

    if (url.pathname === "/api/today") {
      const object = await env.RANKINGS.get(`rankings/${date}.json`);
      if (!object) {
        return json({ error: "Today's puzzle is not ready", date }, 503);
      }
      return json({ date });
    }

    const match = url.pathname.match(/^\/(?:api\/)?check\/(.+)$/);
    if (match) {
      let word;
      try {
        word = decodeURIComponent(match[1]).trim().toLowerCase();
      } catch {
        return json({ error: "Invalid word" }, 400);
      }
      if (!word || word.length > 64) {
        return json({ error: "Invalid word" }, 400);
      }

      const object = await env.RANKINGS.get(`rankings/${date}.json`);
      if (!object) {
        return json({ error: "Today's puzzle is not ready", date }, 503);
      }

      let rankings;
      try {
        rankings = await object.json();
      } catch {
        return json({ error: "Today's puzzle data is unavailable", date }, 503);
      }

      const rank = rankings[word] ?? -1;
      const status = rank === 1 ? "correct" : rank > 0 ? "try again" : "word not found";
      return json({ word, rank, status, date });
    }

    return env.ASSETS.fetch(request);
  },
};
