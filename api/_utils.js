export async function getJson(req) {
  let body = req.body;
  if (body === undefined) {
    let chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString("utf8");
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = {};
    }
  } else if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  return body || {};
}

export function getIdParam(req) {
  if (req.query && req.query.id) return req.query.id;
  const url = req.url || "";
  const m = url.match(/\/api\/applications\/([^/?]+)/);
  return m ? m[1] : null;
}
