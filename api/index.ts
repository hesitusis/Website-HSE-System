import app from "../server.ts";

export default function handler(req: any, res: any) {
  // If Vercel serverless rewrites stripped /api prefix, ensure /api is preserved for Express router
  if (req.url && !req.url.startsWith("/api") && !req.url.startsWith("/api/")) {
    req.url = "/api" + req.url;
  }
  return app(req, res);
}
