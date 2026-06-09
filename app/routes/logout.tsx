import { redirect } from "react-router";
import { rawLogout } from "~/lib/api.server";

/**
 * `/logout` — POST clears the session and redirects to /login.
 *
 * The session cookie is `HttpOnly`, so the client cannot drop it via
 * `document.cookie = ""`.  We have to ask the backend to set a
 * cookie-clearing `Set-Cookie` header for us, then forward that to the
 * browser.
 */
export async function action({ request }: { request: Request }) {
  const cookie = request.headers.get("cookie") || undefined;
  const res = await rawLogout(cookie);

  const headers = new Headers();
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    headers.append("Set-Cookie", setCookie);
  } else {
    // Fallback if the backend didn't reach us — clear the cookie ourselves.
    headers.append(
      "Set-Cookie",
      "atlas-session=;path=/;max-age=0;HttpOnly;SameSite=Lax",
    );
  }

  return redirect("/login", { headers });
}

// GET /logout simply bounces to /login (no session to clear here).
export async function loader() {
  throw redirect("/login");
}
