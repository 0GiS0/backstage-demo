# Deploy Backstage on Azure Container Apps

There are the steps to deploy Backstage on Azure Container Apps.

## Prerequisites

- Azure CLI
- Azure Subscription

## Steps

### 0.Variables

```bash
RESOURCE_GROUP=backstage-on-aca-2
ACR_NAME=backstageimages2
LOCATION=northeurope
AZURE_KEY_VAULT_NAME=backstage-key-vault2
DB_PASSWORD=@P0stgres$RANDOM
DB_SERVER_NAME=backdb2
CONTAINERAPPS_ENVIRONMENT=backstage-environment-2
AZURE_STORAGE_ACCOUNT=backstagestorage2
IDENTITY_NAME=backstage-identity-2
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
az acr login --name $ACR_NAME
az acr build --image backstage:{{.Run.ID}} --registry $ACR_NAME --file packages/backend/Dockerfile .
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
--value postgres@$DB_SERVER_NAME \
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
--secrets "BACKEND_SECRET=keyvaultref:$BACKEND_SECRET_URI,identityref:$BACKSTAGE_IDENTITY_ID" "AZURE_PERSONAL_ACCESS_TOKEN=keyvaultref:$AZURE_PERSONAL_ACCESS_TOKEN_URI,identityref:$BACKSTAGE_IDENTITY_ID" "TECHDOCS_AZURE_CONTAINER_NAME=keyvaultref:$TECHDOCS_AZURE_CONTAINER_NAME_URI,identityref:$BACKSTAGE_IDENTITY_ID" "TECHDOCS_AZURE_ACCOUNT_NAME=keyvaultref:$TECHDOCS_AZURE_ACCOUNT_NAME_URI,identityref:$BACKSTAGE_IDENTITY_ID" "TECHDOCS_AZURE_ACCOUNT_KEY=keyvaultref:$TECHDOCS_AZURE_ACCOUNT_KEY_URI,identityref:$BACKSTAGE_IDENTITY_ID" "AZURE_CLIENT_ID=keyvaultref:$AZURE_CLIENT_ID_URI,identityref:$BACKSTAGE_IDENTITY_ID" "AZURE_CLIENT_SECRET=keyvaultref:$AZURE_CLIENT_SECRET_URI,identityref:$BACKSTAGE_IDENTITY_ID" "AZURE_TENANT_ID=keyvaultref:$AZURE_TENANT_ID_URI,identityref:$BACKSTAGE_IDENTITY_ID" "POSTGRES_HOST=keyvaultref:$POSTGRES_HOST_URI,identityref:$BACKSTAGE_IDENTITY_ID" "POSTGRES_PORT=keyvaultref:$POSTGRES_PORT_URI,identityref:$BACKSTAGE_IDENTITY_ID" "POSTGRES_USER=keyvaultref:$POSTGRES_USER_URI,identityref:$BACKSTAGE_IDENTITY_ID" "POSTGRES_PASSWORD=keyvaultref:$POSTGRES_PASSWORD_URI,identityref:$BACKSTAGE_IDENTITY_ID" \
--env-vars "BACKEND_SECRET=secretref:BACKEND_SECRET" "AZURE_PERSONAL_ACCESS_TOKEN=secretref:AZURE_PERSONAL_ACCESS_TOKEN" "TECHDOCS_AZURE_CONTAINER_NAME=secretref:TECHDOCS_AZURE_CONTAINER_NAME" "TECHDOCS_AZURE_ACCOUNT_NAME=secretref:TECHDOCS_AZURE_ACCOUNT_NAME" "TECHDOCS_AZURE_ACCOUNT_KEY=secretref:TECHDOCS_AZURE_ACCOUNT_KEY" "AZURE_CLIENT_ID=secretref:AZURE_CLIENT_ID" "AZURE_CLIENT_SECRET=secretref:AZURE_CLIENT_SECRET" "AZURE_TENANT_ID=secretref:AZURE_TENANT_ID" "POSTGRES_HOST=secretref:POSTGRES_HOST" "POSTGRES_PORT=secretref:POSTGRES_PORT" "POSTGRES_USER=secretref:POSTGRES_USER" "POSTGRES_PASSWORD=secretref:POSTGRES_PASSWORD" \
--user-assigned $BACKSTAGE_IDENTITY_ID \
--ingress external \
--target-port 7007 \
--registry-username $ACR_NAME \
--registry-password $(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv) \
--registry-server $ACR_NAME.azurecr.io 
```

Update App Registration with the following redirect URI:

```bash
az ad app update --id ${MS_CLIENT_ID} --web-redirect-uris ${URIS}
```