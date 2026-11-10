/** CORS headers for Supabase Edge Functions */
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Returns a JSON Response with CORS headers.
 * Pass body=null for 204 No Content.
 */
export function corsResponse(
  body: unknown,
  status = 200,
): Response {
  if (body === null) {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Handles CORS preflight (OPTIONS) requests.
 * Call this at the top of every Edge Function handler.
 */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  return null;
}
