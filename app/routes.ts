import { type RouteConfig, route, layout } from "@react-router/dev/routes";

export default [
  layout("routes/_app.tsx", [
    route("/", "routes/_app._index.tsx"),
    route("/sponsors", "routes/_app.sponsors._index.tsx"),
    route("/sponsors/:sponsorId", "routes/_app.sponsors.$sponsorId.tsx"),
    route("/sponsors/:sponsorId/:fundId", "routes/_app.sponsors.$sponsorId.$fundId.tsx"),
    route("/vault", "routes/_app.vault.tsx"),
    route("/review", "routes/_app.review.tsx"),
    route("/metrics", "routes/_app.metrics.tsx"),
    route("/copilot", "routes/_app.copilot.tsx"),
  ]),
] satisfies RouteConfig;
