# Deploy Backstage on Azure Container Apps

There are the steps to deploy Backstage on Azure Container Apps.

## Prerequisites

- Azure CLI
- Azure Subscription

## Steps

### 0.Variables

```bash
RESOURCE_GROUP=backstage-on-aca-7
ACR_NAME=backstageimages7
LOCATION=northeurope
AZURE_KEY_VAULT_NAME=backstage-key-vault7
DB_PASSWORD=@P0stgres$RANDOM
DB_SERVER_NAME=backdb7
CONTAINERAPPS_ENVIRONMENT=backstage-environment-7
AZURE_STORAGE_ACCOUNT=backstagestorage7
IDENTITY_NAME=backstage-identity-7
```

### 1. Login to Azure

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
--name docs \
--account-name $AZURE_STORAGE_ACCOUNT
```

### 5.Create an Azure Container Registry

```bash
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --admin-enabled true
```

```bash

# az acr build --image backstage:{{.Run.ID}} --registry $ACR_NAME --file packages/backend/Dockerfile .
```

### 6.Build the Docker image for Backstage

```bash
cd backstage
yarn install --frozen-lockfile
yarn tsc
yarn build:backend --config ../../app-config.yaml


docker build -t $ACR_NAME.azurecr.io/backstage:v1 -f packages/backend/Dockerfile .
```

### 7.Push the image to the Azure Container Registry

```bash
az acr login --name $ACR_NAME
docker push $ACR_NAME.azurecr.io/backstage:v1
```

### 8.Create an Azure Key Vault to store all the secrets

```bash

az keyvault create \
--name $AZURE_KEY_VAULT_NAME \
--resource-group $RESOURCE_GROUP \
--location $LOCATION

source ../.env

BACKEND_SECRET_URI=$(az keyvault secret set \
--vault-name $AZURE_KEY_VAULT_NAME \
--name BACKEND-SECRET \
--value secret \
--query id -o tsv)

AZURE_PERSONAL_ACCESS_TOKEN_URI=$(az keyvault secret set \
--vault-name $AZURE_KEY_VAULT_NAME \
--name AZURE-PERSONAL-ACCESS-TOKEN \
--value $ADO_PAT \
--query id -o tsv)

TECHDOCS_AZURE_CONTAINER_NAME_URI=$(az keyvault secret set \
--vault-name $AZURE_KEY_VAULT_NAME \
--name TECHDOCS-AZURE-CONTAINER-NAME \
--value docs \
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

AZURE_CLIENT_ID_URI=$(az keyvault secret set \
--vault-name $AZURE_KEY_VAULT_NAME \
--name AZURE-CLIENT-ID \
--value $AZURE_CLIENT_ID \
--query id -o tsv)

AZURE_CLIENT_SECRET_URI=$(az keyvault secret set \
--vault-name $AZURE_KEY_VAULT_NAME \
--name AZURE-CLIENT-SECRET \
--value $AZURE_CLIENT_SECRET \
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
$BACKEND_SECRET_URI
$AZURE_PERSONAL_ACCESS_TOKEN_URI
$TECHDOCS_AZURE_CONTAINER_NAME_URI
$TECHDOCS_AZURE_ACCOUNT_NAME_URI
$TECHDOCS_AZURE_ACCOUNT_KEY_URI
$AZURE_CLIENT_ID_URI
$AZURE_CLIENT_SECRET_URI
$AZURE_TENANT_ID
$POSTGRES_HOST_URI
$POSTGRES_PORT_URI
$POSTGRESS_USER_URI
$POSTGRES_PASSWORD_URI
```

Check value of the secrets:

```bash
az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name BACKEND-SECRET --query value -o tsv
az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name AZURE-PERSONAL-ACCESS-TOKEN --query value -o tsv
az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name TECHDOCS-AZURE-CONTAINER-NAME --query value -o tsv
az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name TECHDOCS-AZURE-ACCOUNT-NAME --query value -o tsv
az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name TECHDOCS-AZURE-ACCOUNT-KEY --query value -o tsv
az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name AZURE-CLIENT-ID --query value -o tsv
az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name AZURE-CLIENT-SECRET --query value -o tsv
az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name AZURE-TENANT-ID --query value -o tsv
az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name POSTGRES-HOST --query value -o tsv
az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name POSTGRES-PORT --query value -o tsv
az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name POSTGRES-USER --query value -o tsv
az keyvault secret show --vault-name $AZURE_KEY_VAULT_NAME --name POSTGRES-PASSWORD --query value -o tsv
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
--image $ACR_NAME.azurecr.io/backstage:v1 \
--secrets "backend-secret=keyvaultref:$BACKEND_SECRET_URI,identityref:$BACKSTAGE_IDENTITY_ID" "azure-personal-access-token=keyvaultref:$AZURE_PERSONAL_ACCESS_TOKEN_URI,identityref:$BACKSTAGE_IDENTITY_ID" "techdocs-azure-container-name=keyvaultref:$TECHDOCS_AZURE_CONTAINER_NAME_URI,identityref:$BACKSTAGE_IDENTITY_ID" "techdocs-azure-account-name=keyvaultref:$TECHDOCS_AZURE_ACCOUNT_NAME_URI,identityref:$BACKSTAGE_IDENTITY_ID" "techdocs-azure-account-key=keyvaultref:$TECHDOCS_AZURE_ACCOUNT_KEY_URI,identityref:$BACKSTAGE_IDENTITY_ID" "azure-client-id=keyvaultref:$AZURE_CLIENT_ID_URI,identityref:$BACKSTAGE_IDENTITY_ID" "azure-client-secret=keyvaultref:$AZURE_CLIENT_SECRET_URI,identityref:$BACKSTAGE_IDENTITY_ID" "azure-tenant-id=keyvaultref:$AZURE_TENANT_ID_URI,identityref:$BACKSTAGE_IDENTITY_ID" "postgres-host=keyvaultref:$POSTGRES_HOST_URI,identityref:$BACKSTAGE_IDENTITY_ID" "postgres-port=keyvaultref:$POSTGRES_PORT_URI,identityref:$BACKSTAGE_IDENTITY_ID" "postgres-user=keyvaultref:$POSTGRES_USER_URI,identityref:$BACKSTAGE_IDENTITY_ID" "postgres-password=keyvaultref:$POSTGRES_PASSWORD_URI,identityref:$BACKSTAGE_IDENTITY_ID" \
--env-vars "BACKEND_SECRET=secretref:backend-secret" "AZURE_PERSONAL_ACCESS_TOKEN=secretref:azure-personal-access-token" "TECHDOCS_AZURE_CONTAINER_NAME=secretref:techdocs-azure-container-name" "TECHDOCS_AZURE_ACCOUNT_NAME=secretref:techdocs-azure-account-name" "TECHDOCS_AZURE_ACCOUNT_KEY=secretref:techdocs-azure-account-key" "AZURE_CLIENT_ID=secretref:azure-client-id" "AZURE_CLIENT_SECRET=secretref:azure-client-secret" "AZURE_TENANT_ID=secretref:azure-tenant-id" "POSTGRES_HOST=secretref:postgres-host" "POSTGRES_PORT=secretref:postgres-port" "POSTGRES_USER=secretref:postgres-user" "POSTGRES_PASSWORD=secretref:postgres-password" \
--user-assigned $BACKSTAGE_IDENTITY_ID \
--ingress external \
--target-port 7007 \
--registry-username $ACR_NAME \
--registry-password $(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv) \
--registry-server $ACR_NAME.azurecr.io 
```

Check logs

```bash
az containerapp logs show --name backstage --resource-group $RESOURCE_GROUP
```

### 12. Get the URL of the Azure Container Apps

```bash
CONTAINER_APP_URL=$(az containerapp show --name backstage --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv)
```

Update App Registration with the following redirect URI:

```bash
az login --tenant $AZURE_TENANT_ID --allow-no-subscriptions
az ad app update --id ${AZURE_CLIENT_ID} --web-redirect-uris "https://${CONTAINER_APP_URL}/api/auth/microsoft/handler/frame"
```