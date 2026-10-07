import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Start loading a page's code (and run its guard) when the pointer hovers its link.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  return router;
};
