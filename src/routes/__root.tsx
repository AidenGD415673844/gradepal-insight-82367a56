import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
// useRouter is kept above only because ErrorComponent still uses it.
import { GradeProvider } from "@/lib/grade-store";
import { Toaster } from "@/components/ui/sonner";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { useEffect } from "react";
import { applyThemeProfile, getThemeProfile } from "@/lib/theme-profiles";
import { PeerErrorToastHost } from "@/lib/peerjs-toast";

import appCss from "../styles.css?url";
import katexCss from "katex/dist/katex.min.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Try refreshing.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GradeCalc — Smart School Companion" },
      { name: "description", content: "All-in-one local grade calculator, timetable, study planner and report generator." },
      { property: "og:title", content: "GradeCalc — Smart School Companion" },
      { name: "twitter:title", content: "GradeCalc — Smart School Companion" },
      { property: "og:description", content: "All-in-one local grade calculator, timetable, study planner and report generator." },
      { name: "twitter:description", content: "All-in-one local grade calculator, timetable, study planner and report generator." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7561c8b5-c173-4d98-9ce1-e52b09c59c38/id-preview-767b8528--a26940be-cfed-45c5-9ab0-312ea74f1934.lovable.app-1780551553040.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7561c8b5-c173-4d98-9ce1-e52b09c59c38/id-preview-767b8528--a26940be-cfed-45c5-9ab0-312ea74f1934.lovable.app-1780551553040.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: katexCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    applyThemeProfile(getThemeProfile());
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <GradeProvider>
        <GlobalErrorBoundary>
          <Outlet />
          <Toaster richColors position="top-right" />
          <PeerErrorToastHost />
        </GlobalErrorBoundary>
      </GradeProvider>
    </QueryClientProvider>
  );
}
