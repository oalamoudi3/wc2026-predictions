const FD_URL = "https://api.football-data.org/v4/competitions/WC/matches";

export default async function handler() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing FOOTBALL_DATA_TOKEN" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const res = await fetch(FD_URL, {
    headers: { "X-Auth-Token": token, "Content-Type": "application/json" },
  });

  const body = await res.text();
  return new Response(body || "{}", {
    status: res.status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "Content-Type, X-Auth-Token",
    },
  });
}
