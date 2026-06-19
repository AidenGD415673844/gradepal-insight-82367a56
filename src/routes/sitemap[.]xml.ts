import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://gradepal-insight.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/grades", changefreq: "weekly", priority: "0.9" },
          { path: "/reports", changefreq: "weekly", priority: "0.9" },
          { path: "/forecasting", changefreq: "weekly", priority: "0.8" },
          { path: "/advanced", changefreq: "weekly", priority: "0.7" },
          { path: "/syndicate", changefreq: "weekly", priority: "0.7" },
          { path: "/peers", changefreq: "weekly", priority: "0.7" },
          { path: "/inbox", changefreq: "weekly", priority: "0.6" },
          { path: "/utilities", changefreq: "weekly", priority: "0.7" },
          { path: "/timetable", changefreq: "weekly", priority: "0.7" },
          { path: "/saved-reports", changefreq: "weekly", priority: "0.6" },
          { path: "/criteria", changefreq: "monthly", priority: "0.6" },
          { path: "/teacher", changefreq: "monthly", priority: "0.4" },
          { path: "/changelog", changefreq: "weekly", priority: "0.5" },
          { path: "/settings", changefreq: "monthly", priority: "0.3" },
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});