# Deploy Backstage on Azure Container Apps

There are the steps to deploy Backstage on Azure Container Apps.

## Prerequisites

- Azure CLI
- Azure Subscription

## Steps

### 0.Variables

```bash
RESOURCE_GROUP=backstage-on-aca-gh
ACR_NAME=backstageimagesgh
LOCATION=northeurope
AZURE_KEY_VAULT_NAME=backstagekvgh
DB_PASSWORD=@P0stgres$RANDOM
DB_SERVER_NAME=backdbgh
CONTAINERAPPS_ENVIRONMENT=backstage-env
AZURE_STORAGE_ACCOUNT=backstagestoregh
AZURE_STORAGE_CONTAINER=docs
IDENTITY_NAME=backstage-identity-gh

echo "DB_PASSWORD=$DB_PASSWORD" >> .env

### 1. Login to Azure

First, you need to log in

```bash
az login --use-device-code
```

### 2.Create a resource group

```bash
az group create --name $RESOURCE_GROUP --location $LOCATION
```

### 3.Create PostgreSQL database

```bash
POSTGRES_SERVER_FQDN=$(az postgres flexible-server create \
--resource-group $RESOURCE_GROUP \
--name $DB_SERVER_NAME \
--location $LOCATION \
--admin-user postgres \
--admin-password $DB_PASSWORD \
--public-access 0.0.0.0)

POSTGRES_SERVER_FQDN=$(az postgres flexible-server show --resource-group $RESOURCE_GROUP --name $DB_SERVER_NAME --query fullyQualifiedDomainName -o tsv)

# Disable SSL transport
 az postgres flexible-server parameter set --server-name $DB_SERVER_NAME --resource-group $RESOURCE_GROUP --name require_secure_transport --value off 
```

### 4.Create an Azure Storage Account

```bash
az storage account create \
--name $AZURE_STORAGE_ACCOUNT \
--resource-group $RESOURCE_GROUP \
--location $LOCATION \
--sku Standard_LRS

az storage container create \
--name $AZURE_STORAGE_CONTAINER \
--account-name $AZURE_STORAGE_ACCOUNT
```

### 5.Create an Azure Container Registry

```bash
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --admin-enabled true
```

```bash
cd backstage
yarn install --frozen-lockfile
yarn tsc
yarn build:backend --config ../../app-config.yaml --config ../../app-config.production.yaml
cd ..
az acr run -f acr-task.yaml --registry $ACR_NAME ./backstage

# Get the latest image
LAST_IMAGE_TAG=$(az acr repository show-tags --name $ACR_NAME --repository backstage --orderby time_desc --query '[0]' -o tsv)
```

### 8.Create an Azure Key Vault to store all the secrets

```bash
az keyvault create \
--name $AZURE_KEY_VAULT_NAME \
--resource-group $RESOURCE_GROUP \
--location $LOCATION \
--enable-rbac-authorization false


BACKEND_SECRET_URI=$(az keyvault secret set \
--vault-name $AZURE_KEY_VAULT_NAME \
--name BACKEND-SECRET \
--value secret \
--query id -o tsv)


GITHUB_TOKEN_URI=$(az keyvault secret set \
--vault-name $AZURE_KEY_VAULT_NAME \
--name GITHUB-TOKEN \
--value $GITHUB_TOKEN \
--query id -o tsv)

TECHDOCS_AZURE_CONTAINER_NAME_URI=$(az keyvault secret set \
--vault-name $AZURE_KEY_VAULT_NAME \
--name TECHDOCS-AZURE-CONTAINER-NAME \
--value $AZURE_STORAGE_CONTAINER \
--query id -o tsv)

TECHDOCS_AZURE_ACCOUNT_NAME_URI=$(az keyvault secret set \
--vault-name $AZURE_KEY_VAULT_NAME \
--name TECHDOCS-AZURE-ACCOUNT-NAME \
--value $AZURE_STORAGE_ACCOUNT \
--query id -o tsv)

STORAGE_ACCOUNT_KEY=$(az storage account keys list --resource-group $RESOURCE_GROUP --account-name $AZURE_STORAGE_ACCOUNT --query "[0].value" -o tsv)

TECHDOCS_AZURE_ACCOUNT_KEY_URI=$(az keyvault secret set \
--vault-name $AZURE_KEY_VAULT_NAME \
--name TECHDOCS-AZURE-ACCOUNT-KEY \
--value $STORAGE_ACCOUNT_KEY \
--query id -o tsv)

GITHUB_APP_CLIENT_ID_URI=$(az keyvault secret set \
--vault-name $AZURE_KEY_VAULT_NAME \
--name GITHUB-APP-CLIENT-ID \
--value $GITHUB_CLIENT_ID \
--query id -o tsv)

GITHUB_APP_CLIENT_SECRET_URI=$(az keyvault secret set \
--vault-name $AZURE_KEY_VAULT_NAME \
--name GITHUB-APP-CLIENT-SECRET \
--value $GITHUB_CLIENT_SECRET \
--query id -o tsv)

AZURE_TENANT_ID_URI=$(az keyvault secret set \
--vault-name $AZURE_KEY_VAULT_NAME \
--name AZURE-TENANT-ID \
--value $AZURE_TENANT_ID \
--query id -o tsv)

POSTGRES_HOST_URI=$(az keyvault secret set \
--vault-name $AZURE_KEY_VAULT_NAME \
--name POSTGRES-HOST \
--value $POSTGRES_SERVER_FQDN \
--query id -o tsv)

POSTGRES_PORT_URI=$(az keyvault secret set \
--vault-name $AZURE_KEY_VAULT_NAME \
--name POSTGRES-PORT \
--value 5432 \
--query id -o tsv)

POSTGRES_USER_URI=$(az keyvault secret set \
--vault-name $AZURE_KEY_VAULT_NAME \
--name POSTGRES-USER \
--value postgres \
--query id -o tsv)

POSTGRES_PASSWORD_URI=$(az keyvault secret set \
--vault-name $AZURE_KEY_VAULT_NAME \
--name POSTGRES-PASSWORD \
--value $DB_PASSWORD \
--query id -o tsv)
```

You can check all URI values:

```bash
echo "Backend secret URI: $BACKEND_SECRET_URI"
echo "GitHub token URI: $GITHUB_TOKEN_URI"
echo "Azure Storage Container URI: $TECHDOCS_AZURE_CONTAINER_NAME_URI"
echo "Azure Storage Name URI: $TECHDOCS_AZURE_ACCOUNT_NAME_URI"
echo "Azure Storage access key URI: $TECHDOCS_AZURE_ACCOUNT_KEY_URI"
echo "GitHub App Client ID URI:$GITHUB_APP_CLIENT_ID_URI"
echo "GitHub App Client Secret URI:$GITHUB_APP_CLIENT_SECRET_URI"
echo "Azure tenant ID URI:$AZURE_TENANT_ID_URI"
echo "Postgres host URI:$POSTGRES_HOST_URI"
echo "Postgres port URI:$POSTGRES_PORT_URI"
echo "Postgres user URI:$POSTGRES_USER_URI"
echo "Postgres password URI:$POSTGRES_PASSWORD_URI"
```

Check value of the secrets:

```bash
echo "Backend secret: $(az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name BACKEND-SECRET --query value -o tsv)"
echo "GitHub token: $(az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name GITHUB-TOKEN --query value -o tsv)"
echo "Azure Storage Container: $(az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name TECHDOCS-AZURE-CONTAINER-NAME --query value -o tsv)"
echo "Azure Storage Name: $(az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name TECHDOCS-AZURE-ACCOUNT-NAME --query value -o tsv)"
echo "Azure Storage access key: $(az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name TECHDOCS-AZURE-ACCOUNT-KEY --query value -o tsv)"
echo "GitHub App Client ID: $(az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name GITHUB-APP-CLIENT-ID --query value -o tsv)"
echo "GitHub App Client Secret: $(az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name GITHUB-APP-CLIENT-SECRET --query value -o tsv)"
echo "Azure tenant ID: $(az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name AZURE-TENANT-ID --query value -o tsv)"
echo "Postgres host: $(az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name POSTGRES-HOST --query value -o tsv)"
echo "Postgres port: $(az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name POSTGRES-PORT --query value -o tsv)"
echo "Postgres user: $(az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name POSTGRES-USER --query value -o tsv)"
echo "Postgres password: $(az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name POSTGRES-PASSWORD --query value -o tsv)"
```

### 9.Deploy the image to Azure Container Apps

Make sure you have the Azure Container Apps extension installed:

```bash
az extension add --name containerapp --upgrade
```

Create the Azure Container Apps Environment

```bash
# Create a container app environment
az containerapp env create \
--name $CONTAINERAPPS_ENVIRONMENT \
--resource-group $RESOURCE_GROUP \
--location $LOCATION
```

### 10. Create an identity for backstage container in order to access the Key Vault

```bash
BACKSTAGE_IDENTITY_ID=$(az identity create --name $IDENTITY_NAME --resource-group $RESOURCE_GROUP --query id -o tsv)
```

Give permissions to the identity to access the Key Vault

```bash
az keyvault set-policy --name $AZURE_KEY_VAULT_NAME --object-id $(az identity show --name $IDENTITY_NAME --resource-group $RESOURCE_GROUP --query principalId -o tsv) --secret-permissions get list
```

### 11.Create the Azure Container Apps

```bash
# Create a container app
az containerapp create \
--name backstage \
--environment $CONTAINERAPPS_ENVIRONMENT \
--resource-group $RESOURCE_GROUP \
--min-replicas 1 \
--image "$ACR_NAME.azurecr.io/backstage:$LAST_IMAGE_TAG" \
--secrets "backend-secret=keyvaultref:$BACKEND_SECRET_URI,identityref:$BACKSTAGE_IDENTITY_ID" "github-token=keyvaultref:$GITHUB_TOKEN_URI,identityref:$BACKSTAGE_IDENTITY_ID" "techdocs-azure-container-name=keyvaultref:$TECHDOCS_AZURE_CONTAINER_NAME_URI,identityref:$BACKSTAGE_IDENTITY_ID" "techdocs-azure-account-name=keyvaultref:$TECHDOCS_AZURE_ACCOUNT_NAME_URI,identityref:$BACKSTAGE_IDENTITY_ID" "techdocs-azure-account-key=keyvaultref:$TECHDOCS_AZURE_ACCOUNT_KEY_URI,identityref:$BACKSTAGE_IDENTITY_ID" "github-app-client-id=keyvaultref:$GITHUB_APP_CLIENT_ID_URI,identityref:$BACKSTAGE_IDENTITY_ID" "github-app-client-secret=keyvaultref:$GITHUB_APP_CLIENT_SECRET_URI,identityref:$BACKSTAGE_IDENTITY_ID" "azure-tenant-id=keyvaultref:$AZURE_TENANT_ID_URI,identityref:$BACKSTAGE_IDENTITY_ID" "postgres-host=keyvaultref:$POSTGRES_HOST_URI,identityref:$BACKSTAGE_IDENTITY_ID" "postgres-port=keyvaultref:$POSTGRES_PORT_URI,identityref:$BACKSTAGE_IDENTITY_ID" "postgres-user=keyvaultref:$POSTGRES_USER_URI,identityref:$BACKSTAGE_IDENTITY_ID" "postgres-password=keyvaultref:$POSTGRES_PASSWORD_URI,identityref:$BACKSTAGE_IDENTITY_ID" \
--env-vars "BACKEND_SECRET=secretref:backend-secret" "GITHUB_TOKEN=secretref:github-token" "TECHDOCS_AZURE_CONTAINER_NAME=secretref:techdocs-azure-container-name" "TECHDOCS_AZURE_ACCOUNT_NAME=secretref:techdocs-azure-account-name" "TECHDOCS_AZURE_ACCOUNT_KEY=secretref:techdocs-azure-account-key" "GITHUB_APP_CLIENT_ID=secretref:github-app-client-id" "GITHUB_APP_CLIENT_SECRET=secretref:github-app-client-secret" "AZURE_TENANT_ID=secretref:azure-tenant-id" "POSTGRES_HOST=secretref:postgres-host" "POSTGRES_PORT=secretref:postgres-port" "POSTGRES_USER=secretref:postgres-user" "POSTGRES_PASSWORD=secretref:postgres-password" "NODE_ENV=production" \
--user-assigned $BACKSTAGE_IDENTITY_ID \
--ingress external \
--target-port 7007 \
--registry-username $ACR_NAME \
--registry-password $(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv) \
--registry-server $ACR_NAME.azurecr.io
```

Check logs

```bash
az containerapp logs show --name backstage --resource-group $RESOURCE_GROUP --follow
```

If you need to access to the console you can use `exec` command

```
az containerapp exec -n backstage -g $RESOURCE_GROUP
```

### 12. Get the URL of the Azure Container Apps

```bash
CONTAINER_APP_URL=$(az containerapp show --name backstage --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv)
```

This is the URL of the Azure Container Apps:

```bash
echo https://$CONTAINER_APP_URL
```

Update GitHub App the following redirect URI:

```bash
echo "https://${CONTAINER_APP_URL}/api/auth/github"
```

Clean-up

```
az group delete -n $RESOURCE_GROUP --yes
```

Purge Azure Key Vault

```
az keyvault purge -n $AZURE_KEY_VAULT_NAME
```