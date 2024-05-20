/*
 * Hi!
 *
 * Note that this is an EXAMPLE Backstage backend. Please check the README.
 *
 * Happy hacking!
 */

import { createBackend } from '@backstage/backend-defaults';


import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node/alpha';
import { DefaultGithubCredentialsProvider, ScmIntegrations } from '@backstage/integration';
import { coreServices, createBackendModule } from '@backstage/backend-plugin-api';
import { createNewFileAction } from './plugins/scaffolder/actions/common/createFile';
import { githubEnableGHAS } from './plugins/scaffolder/actions/github/githubEnableGHAS';


const backend = createBackend();

backend.add(import('@backstage/plugin-app-backend/alpha'));
backend.add(import('@backstage/plugin-proxy-backend/alpha'));
backend.add(import('@backstage/plugin-scaffolder-backend/alpha'));
backend.add(import('@backstage/plugin-techdocs-backend/alpha'));

// auth plugin
backend.add(import('@backstage/plugin-auth-backend'));

// catalog plugin
backend.add(import('@backstage/plugin-catalog-backend/alpha'));
backend.add(import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'));

// permission plugin
backend.add(import('@backstage/plugin-permission-backend/alpha'));
backend.add(import('@backstage/plugin-permission-backend-module-allow-all-policy'));

// search plugin
backend.add(import('@backstage/plugin-search-backend/alpha'));
backend.add(import('@backstage/plugin-search-backend-module-catalog/alpha'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs/alpha'));

// Microsoft Entra Id - Org Data
backend.add(import('@backstage/plugin-catalog-backend-module-msgraph/alpha'));

// For Microsoft login
backend.add(import('@backstage/plugin-auth-backend-module-microsoft-provider'));

// Azure DevOps Discovery
backend.add(import('@backstage/plugin-catalog-backend-module-azure/alpha'));

// Azure DevOps scaffolder
backend.add(import('@backstage/plugin-scaffolder-backend-module-azure'));

// Register custom actions
const scaffolderModuleCustomExtensions = createBackendModule({
  pluginId: 'scaffolder', // name of the plugin that the module is targeting
  moduleId: 'custom-extensions',
  register(env) {
    env.registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        config: coreServices.rootConfig
        // ... and other dependencies as needed
      },
      async init({ scaffolder, config /* ..., other dependencies */ }) {
        // Here you have the opportunity to interact with the extension
        // point before the plugin itself gets instantiated

        const integrations = ScmIntegrations.fromConfig(config);
        const githubCredentialsProvider = DefaultGithubCredentialsProvider.fromIntegrations(integrations);

        // Create a new file
        scaffolder.addActions(createNewFileAction());
      },
    });
  },
});


backend.add(scaffolderModuleCustomExtensions());

backend.start();
