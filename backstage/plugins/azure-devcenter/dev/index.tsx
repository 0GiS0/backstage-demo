import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { azureDevcenterPlugin, AzureDevcenterPage } from '../src/plugin';

createDevApp()
  .registerPlugin(azureDevcenterPlugin)
  .addPage({
    element: <AzureDevcenterPage />,
    title: 'Root Page',
    path: '/azure-devcenter',
  })
  .render();
