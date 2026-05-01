import { render } from '@testing-library/react'
import {
  createRouter,
  createRootRoute,
  createRoute,
  RouterProvider,
  createMemoryHistory,
  Outlet,
} from '@tanstack/react-router'
import type { ReactElement } from 'react'

export function renderWithRouter(ui: ReactElement) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> })
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => ui })
  const libraryRoute = createRoute({ getParentRoute: () => rootRoute, path: '/library' })
  const routeTree = rootRoute.addChildren([indexRoute, libraryRoute])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  return render(<RouterProvider router={router} />)
}
