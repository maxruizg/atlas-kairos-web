import { type RouteConfig, route, layout } from "@react-router/dev/routes";

export default [
  route("/login", "routes/login.tsx"),
  route("/signup", "routes/signup.tsx"),
  route("/onboarding", "routes/onboarding.tsx"),
  route("/logout", "routes/logout.tsx"),
  route("/api/data", "routes/api.data.tsx"),
  layout("routes/_app.tsx", [
    route("/", "routes/_app._index.tsx"),
    route("/dashboard", "routes/_app.dashboard.tsx"),
    route("/sponsors", "routes/_app.sponsors._index.tsx"),
    route("/sponsors/:sponsorId", "routes/_app.sponsors.$sponsorId.tsx"),
    route("/sponsors/:sponsorId/:fundId", "routes/_app.sponsors.$sponsorId.$fundId.tsx"),
    route("/directs", "routes/_app.directs._index.tsx"),
    route("/directs/:id", "routes/_app.directs.$id.tsx"),
    route("/vault", "routes/_app.vault.tsx"),
    route("/review", "routes/_app.review.tsx"),
    route("/metrics", "routes/_app.metrics.tsx"),
    route("/ledger", "routes/_app.ledger.tsx"),
    route("/qa", "routes/_app.qa.tsx"),
    route("/atlas-ai", "routes/_app.atlas-ai.tsx"),
    route("/settings", "routes/_app.settings.tsx"),
  ]),
] satisfies RouteConfig;
