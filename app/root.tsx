import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from "react-router";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>ATLAS</title>
        <Meta />
        <Links />
      </head>
      <body className="bg-atlas-bg font-sans text-atlas-white antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  let status = 500;
  let message = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    status = error.status;
    message = error.statusText || error.data?.toString() || message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="flex items-center justify-center h-screen bg-atlas-bg">
      <div className="text-center">
        <div className="text-6xl font-bold text-atlas-purple mb-4">{status}</div>
        <div className="text-lg text-atlas-gray2 mb-2">Something went wrong</div>
        <div className="text-sm text-atlas-gray4 max-w-md">{message}</div>
        <a href="/" className="inline-block mt-6 px-4 py-2 rounded-lg bg-atlas-purple text-white text-sm font-semibold no-underline">
          Go Home
        </a>
      </div>
    </div>
  );
}
