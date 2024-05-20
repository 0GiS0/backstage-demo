# How to use Backstage with Microsoft Entra ID and Azure DevOps

Hi developer 👋🏻! 

In this branch I'm going to show you how you can use Backstage with Microsoft Entra ID as identity provider and Azure DevOps as source control system.

## Getting started

In order to start the project and its dependencies, you can use Dev Containers or GitHub Codespaces.

> [!IMPORTANT]
> If you are using Dev Containers, you need to have Docker installed in your machine.

## Microsoft Entra ID as identity provider

The first thing you need to do is to register an application in Microsoft Entra ID. You can do this using the Azure portal or the Azure CLI.

### Login in your Azure tenant

To login in your Azure tenant, you need to run the following command:

```bash
AZURE_TENANT_ID=e26de2cd-b981-4ec4-a628-95cb1e11debf
az login --tenant $AZURE_TENANT_ID --allow-no-subscriptions --use-device-code
```

### Register the application using Azure CLI

To register the application using the Azure CLI, you need to run the following command:

```bash
MICROSOFT_ENTRAID_CLIENT_ID=$(az ad app create --display-name backstage-demo --web-redirect-uris http://localhost:7007/api/auth/microsoft/handler/frame --query appId -o tsv)
```

Then you need to generate a secret for the application:

```bash
MICROSOFT_ENTRAID_CLIENT_SECRET=$(az ad app credential reset --id $MICROSOFT_ENTRAID_CLIENT_ID --query password -o tsv)
```

Now we can save this values in an .env file:

```bash
echo "export AZURE_TENANT_ID=$AZURE_TENANT_ID" >> .env
echo "export MICROSOFT_ENTRAID_CLIENT_ID=$MICROSOFT_ENTRAID_CLIENT_ID" >> .env
echo "export MICROSOFT_ENTRAID_CLIENT_SECRET=$MICROSOFT_ENTRAID_CLIENT_SECRET" >> .env
```

and now load the values in your terminal:

```bash
source .env
```

Finally, you need to grant the required permissions to the application:

### Permissions required

In order to give Backstage access to your Microsoft Entra ID tenant, you need to grant the following permissions:

- `User.Read`: Allows users to sign-in to the app, and allows the app to read the profile of signed-in users. It also allows the app to read basic company information of signed-in users.
- `User.Read.All`: Allows the app to read the full set of profile properties, reports, and managers of other users in your organization, on behalf of the signed-in user.
- `GroupMember.Read.All`: Allows the app to read the full profile of the signed-in user.
- `profile`: Allows the app to see your users' basic profile (e.g., name, picture, user name, email address).
- `openid`: Allows users to sign in to the app with their work or school accounts and allows the app to see basic user profile information.
- `email`: Allows the app to read your users' primary email address.
- `offline_access`: Allows the app to see and update the data you gave it access to, even when users are not currently using the app. This does not give the app any additional permissions.

You can check all the permissions [here](https://learn.microsoft.com/en-us/graph/permissions-reference). You also need to copy the identifier for each permission. But don't worry, I did this for you 😄.

```bash
az ad app permission add --id $MICROSOFT_ENTRAID_CLIENT_ID --api 00000003-0000-0000-c000-000000000000 --api-permissions e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope # User.Read
az ad app permission add --id $MICROSOFT_ENTRAID_CLIENT_ID --api 00000003-0000-0000-c000-000000000000 --api-permissions 37f7f235-527c-4136-accd-4a02d197296e=Scope # openid
az ad app permission add --id $MICROSOFT_ENTRAID_CLIENT_ID --api 00000003-0000-0000-c000-000000000000 --api-permissions 64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0=Scope # email
az ad app permission add --id $MICROSOFT_ENTRAID_CLIENT_ID --api 00000003-0000-0000-c000-000000000000 --api-permissions 7427e0e9-2fba-42fe-b0c0-848c9e6a8182=Scope # offline_access
az ad app permission add --id $MICROSOFT_ENTRAID_CLIENT_ID --api 00000003-0000-0000-c000-000000000000 --api-permissions 14dad69e-099b-42c9-810b-d002981feec1=Scope # profile

az ad app permission add --id $MICROSOFT_ENTRAID_CLIENT_ID --api 00000003-0000-0000-c000-000000000000 --api-permissions df021288-bdef-4463-88db-98f22de89214=Role # User.Read.All
az ad app permission add --id $MICROSOFT_ENTRAID_CLIENT_ID --api 00000003-0000-0000-c000-000000000000 --api-permissions 98830695-27a2-44f7-8c18-0c3ebc9698f6=Role # GroupMember.Read.All

sleep 60 # Wait for the permissions to be granted

# Grant admin consent
az ad app permission admin-consent --id $MICROSOFT_ENTRAID_CLIENT_ID
```

### Configure `app-config.yaml`

We need to configure Microsoft Entra ID in two ways: first we need to retrieve all users and groups from our tentant using `microsoftGraphOrg`provider:

```yaml
catalog:
  orphanStrategy: delete  
  providers:
    microsoftGraphOrg:
      authority: https://login.microsoftonline.com/${AZURE_TENANT_ID}
      clientId: ${MICROSOFT_ENTRAID_CLIENT_ID}
      clientSecret: ${MICROSOFT_ENTRAID_CLIENT_SECRET}
      tenantId: ${AZURE_TENANT_ID}
      tokenAudience: https://graph.microsoft.com
      user:
        filter: "accountEnabled eq true and userType eq 'Member'"
      group:
        filter: securityEnabled eq true
      schedule:
        frequency: PT1M
        timeout: PT50M  
```

With this configuration, Backstage will retrieve all users and groups from your tenant.

The second step is to configure the authentication provider:

```yaml
auth:
  # see https://backstage.io/docs/auth/ to learn about auth providers
  providers:
    # See https://backstage.io/docs/auth/guest/provider
    microsoft:
      development:
        clientId: ${MICROSOFT_ENTRAID_CLIENT_ID}
        clientSecret: ${MICROSOFT_ENTRAID_CLIENT_SECRET}
        tenantId: ${AZURE_TENANT_ID}
        domainHint: ${AZURE_TENANT_ID}
        signIn:
          resolvers:
            - resolver: emailMatchingUserEntityProfileEmail
```

With this configuration, Backstage will use Microsoft Entra ID as identity provider.

### Install the plugin

Now you need to install a couple of plugins in your Backstage app:

```bash
cd backstage
yarn install
yarn --cwd packages/backend add @backstage/plugin-catalog-backend-module-msgraph
yarn --cwd packages/backend add @backstage/plugin-auth-backend-module-microsoft-provider
```

And add them to the `packages/backend/index.ts` file:

```typescript
// For Microsoft login
backend.add(import('@backstage/plugin-auth-backend-module-microsoft-provider'));

// Microsoft Entra Id - Org Data
backend.add(import('@backstage/plugin-catalog-backend-module-msgraph/alpha'));
```

Lastly, you need to modify `packages/app/src/App.tsx` to include the Microsoft Entra ID login button:

```tsx
import { microsoftAuthApiRef } from '@backstage/core-plugin-api';

const MicrosoftProvider: SignInProviderConfig = {
  id: 'microsoft-auth-provider',
  title: 'Microsoft',
  message: 'Sign in using Microsoft',
  apiRef: microsoftAuthApiRef,
};

...

// components: {
  //   SignInPage: props => <SignInPage {...props} auto providers={['guest']} />,
  // },
  components: {
    SignInPage: props => (
      <SignInPage
        {...props}
        auto        
        provider={MicrosoftProvider}
      />
    ),
  },
});  
```

Now, let's start the app:

```bash
yarn dev
```

And you should be able to see the Microsoft Entra ID login button in the login page and login using your Microsoft Entra ID account.

## Azure DevOps as source control system

Now you can access Backstage using Microsoft Entra ID as identity provider. The next step is to configure Azure DevOps as source control system in order to populate the catalog with your components.

> [!IMPORTANT]
>Azure discovery is driven by the Code Search feature in Azure DevOps, this may not be enabled by default. If the Code Search extension is not listed then you can install it from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=ms.vss-code-search&targetId=f9352dac-ba6e-434e-9241-a848a510ce3f&utm_source=vstsproduct&utm_medium=SearchExtStatus).

#### Create a Personal Access Token

In order to access Azure DevOps, you need to create a Personal Access Token (PAT). You can do this following the steps [here](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops&tabs=Windows#create-a-pat). The scopes you need to grant are:

- `Code (Read, write, & manage)`
- `Project and Team (Read & write)`

Save your PAT in your .env file and load it in your terminal:

```bash
source ../.env
```

#### Configure `app-config.yaml`

Now you need to configure Azure DevOps in the `app-config.yaml` file, in the `catalog` section:

```yaml
    azureDevOps:
      returngisorg:
        organization: returngisorg
        # project: "*" # this will match all projects
        project: '*'
        # project: Backstage # this will match all projects
        # repository: '*' # this will match all repos
        path: /catalog-info.yaml
        schedule:
          frequency: { minutes: 1 }
          # supports ISO duration, "human duration" as used in code
          timeout: { minutes: 3 }
```

Also you have to add your Personal Access Token in the `app-config.yaml` file:

```yaml
integrations:
  azure:
    - host: dev.azure.com      
      token: ${ADO_PAT}
```

And test the integration:

```bash
yarn --cwd packages/backend add @backstage/plugin-catalog-backend-module-azure

yarn dev
```

### Software templates with Azure DevOps

Before using Software templates with Azure DevOps you must install the `@backstage/plugin-scaffolder-backend-module-azure` plugin:

```bash
yarn --cwd packages/backend add @backstage/plugin-scaffolder-backend-module-azure
```

And add it to the `packages/backend/index.ts` file:

```typescript
// Azure DevOps scaffolder
backend.add(import('@backstage/plugin-scaffolder-backend-module-azure'));
```

If you run the app you'll see the actions that you can use with Azure DevOps in http://localhost:3000/create/actions.

For this demo I've create this template:

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
# some metadata about the template itself
metadata:
  name: dotnet8-template
  title: Dotnet 8 Template
  description: Scaffold a new .NET 8 project
  tags:
    - dotnet
    - csharp
    - webapi
    - recommended
spec:
  owner: user:daenerys_returngis.net
  type: service
  # these are the steps which are rendered in the frontend with the form input
  # https://backstage.io/docs/features/software-templates/input-examples
  parameters:
    - title: Complete the form to create a new .NET 8 project
      required:
        - name
        - description
        - system
      properties:
        name:
          type: string
          title: Project Name
          description: The name of the project
          ui:autofocus: true
          ui:field: ValidateKebabCase
        description:
          title: Description
          type: string
          description: A description for the component
        owner:
          title: Select in which group the component will be created
          type: string
          description: The group the component belongs to
          ui:field: MyGroupsPicker
        system:
          title: System
          type: string
          description: The system the component belongs to
          ui:field: EntityPicker
          ui:options:
            catalogFilter:
              kind: System
    - title: Choose a destination
      required:
        - repoUrl
      properties:
        repoUrl:
          type: string
          ui:field: RepoUrlPicker
          ui:options:
            allowedHosts:
              - dev.azure.com
            allowedOrganizations:
              - returngisorg
            allowedOwners: []
            allowedProjects:
              - Backstage
              - Tour-Of-Heroes
            allowedRepos: []
  steps:
    - id: fetch-base
      name: Fetch Template
      action: fetch:template
      input:
        url: ./skeleton
        copyWithoutTemplating:
          - .github/workflows/*
        values:
          name: ${{ parameters.name }}
          owner: ${{ parameters.owner }}
          description: ${{ parameters.description }}
          destination: ${{ parameters.repoUrl | parseRepoUrl }}
          repoUrl: ${{ parameters.repoUrl }}
          system: ${{ parameters.system }}
    - id: acme:file:create
      name: Create a README file
      action: acme:file:create
      input:
        filename: README.md
        contents: |
          # ${{ parameters.name }}          
          ${{ parameters.description }}

          This is a new .NET 8 project created with 💚 using Backstage.
    - id: publish
      name: Publish
      action: publish:azure
      input:
        repoUrl: ${{ parameters.repoUrl }}
        defaultBranch: main
    - id: register
      name: Register
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps['publish'].output.repoContentsUrl }}
        catalogInfoPath: "/catalog-info.yaml"    
  output:
    links:
      - title: Repository
        url: ${{ steps['publish'].output.remoteUrl }}
      - title: Open in catalog
        icon: catalog
        entityRef: ${{ steps['register'].output.entityRef }}
```

### Azure Pipelines to build your documentation

If you don't have it, you need to create an Azure Blob Storage account to store your documentation. You can do this using the Azure CLI:

```bash
RESOURCE_GROUP=backstage-with-ado
LOCATION=northeurope
AZURE_STORAGE_ACCOUNT_NAME=returngisbackstagestore
AZURE_STORAGE_CONTAINER_NAME=techdocs

az group create --name $RESOURCE_GROUP --location $LOCATION

az storage account create \
--name $AZURE_STORAGE_ACCOUNT_NAME \
--resource-group $RESOURCE_GROUP \
--location $LOCATION \
--sku Standard_LRS

az storage container create \
--name $AZURE_STORAGE_CONTAINER_NAME \
--account-name $AZURE_STORAGE_ACCOUNT_NAME

AZURE_STORAGE_ACCOUNT_KEY=$(az storage account keys list --account-name $AZURE_STORAGE_ACCOUNT_NAME --resource-group $RESOURCE_GROUP --query "[0].value" -o tsv)

echo "export TECHDOCS_AZURE_ACCOUNT_NAME=$AZURE_STORAGE_ACCOUNT_NAME" >> ../.env
echo "export TECHDOCS_AZURE_ACCOUNT_KEY=$AZURE_STORAGE_ACCOUNT_KEY" >> ../.env
echo "export TECHDOCS_AZURE_CONTAINER_NAME=$AZURE_STORAGE_CONTAINER_NAME" >> ../.env

source ../.env
```

Change your `app-config.yaml` file to include the Azure Blob Storage account:

```yaml
techdocs:
  builder: "external" # Alternatives - 'local'
  generator:
    runIn: "docker" # Alternatives - 'local'
  publisher:
    type: "azureBlobStorage" # Alternatives - 'googleGcs' or 'awsS3'. Read documentation for using alternatives.
    azureBlobStorage:
      containerName: ${TECHDOCS_AZURE_CONTAINER_NAME}
      credentials:
        accountName: ${TECHDOCS_AZURE_ACCOUNT_NAME}
        accountKey: ${TECHDOCS_AZURE_ACCOUNT_KEY} 
```

Now you need to create an Azure Pipeline to build your documentation. You can use the following `azure-pipelines.yml` file:

```yaml
trigger:
  branches:
    include:
    - main
  paths:
    include:
    - .azure-pipelines.yml
    - docs/**
    - mkdocs.yml

pool:
  vmImage: 'ubuntu-latest'

variables:
  ENTITY_NAMESPACE: 'default'
  ENTITY_KIND: 'component'
  ENTITY_NAME: 'dragons-api'

steps:
- checkout: self

- task: NodeTool@0
  inputs:
    versionSpec: '18.x'
  displayName: 'Install Node.js'

- script: |
    npm install -g @techdocs/cli
  displayName: 'Install TechDocs CLI'

- script: |
    pip install mkdocs-techdocs-core
  displayName: 'Install MkDocs TechDocs Core'

- script: |
    techdocs-cli generate --no-docker --verbose
  displayName: 'Generate documentation'

- script: |
    techdocs-cli publish \
    --entity $(ENTITY_NAMESPACE)/$(ENTITY_KIND)/$(ENTITY_NAME) \
    --publisher-type azureBlobStorage \
    --azureAccountName $(AZURE_STORAGE_ACCOUNT_NAME) \
    --azureAccountKey $(AZURE_STORAGE_ACCOUNT_KEY) \
    --storage-name $(AZURE_STORAGE_CONTAINER_NAME)
  displayName: 'Publish documentation on Azure Blob Storage'
  env:
    AZURE_STORAGE_ACCOUNT_NAME: $(AZURE_STORAGE_ACCOUNT_NAME)
    AZURE_STORAGE_ACCOUNT_KEY: $(AZURE_STORAGE_ACCOUNT_KEY)
    AZURE_STORAGE_CONTAINER_NAME: $(AZURE_STORAGE_CONTAINER_NAME)
```

> [!IMPORTANT]
> Don't forget to add AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY and AZURE_STORAGE_CONTAINER_NAME to your pipeline variables.

And now run it:

```bash
yarn dev
```

Happy coding! 🚀
