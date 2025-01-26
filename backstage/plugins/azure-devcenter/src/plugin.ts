import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const azureDevcenterPlugin = createPlugin({
  id: 'azure-devcenter',
  routes: {
    root: rootRouteRef,
  },
});

export const AzureDevcenterPage = azureDevcenterPlugin.provide(
  createRoutableExtension({
    name: 'AzureDevcenterPage',
    component: () =>
      import('./components/ExampleComponent').then(m => m.ExampleComponent),
    mountPoint: rootRouteRef,
  }),
);
