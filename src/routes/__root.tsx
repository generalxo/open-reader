import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import BaseLayout from '../ui/layouts/BaseLayout'

const RootLayout = () => (
  <BaseLayout>
    <Outlet />
    {import.meta.env.DEV && <TanStackRouterDevtools />}
  </BaseLayout>
)

export const Route = createRootRoute({ component: RootLayout })