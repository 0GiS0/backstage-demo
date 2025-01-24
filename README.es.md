# Cómo desplegar Backstage en Azure Container Apps

¡Hola developer 👋🏻! Este branch contiene el código, y la configuración necesaria, para desplegar Backstage en Azure Container Apps. El mismo lo utilicé como parte mi vídeo [8. Cómo desplegar Backstage en Azure Container Apps](https://youtu.be/3YD-epHpOjk?si=peWmAXuP4jbQyzun), de [mi serie sobre Platform Engineering](https://youtube.com/playlist?list=PLO9JpmNAsqM6RttdyDmPyW0vR_zf20ETI&si=uZ3IWFPFOeCEXZez).

[![8. Cómo desplegar Backstage en Azure Container Apps](docs/images/8.%20Desplegar%20Backstage%20en%20Azure%20Container%20Apps.png)](https://youtu.be/3YD-epHpOjk?si=nV-XOeBy3LdRu7Z7)

## Requisitos

Para poder ejecutar este entorno puedes hacerlo de forma sencilla utilizando Dev Containers. En caso contrario necesitarás:

- Node.js 18 o 20
- Azure CLI

## Pasos

### 0.Variables

Lo primero que necesitas es configurar las variables de entorno. Puedes hacerlo de forma sencilla ejecutando el siguiente comando:

```bash
RESOURCE_GROUP=backstage-aca
ACR_NAME=backstageimages
LOCATION=northeurope
AZURE_KEY_VAULT_NAME=backstage-key-vault
DB_PASSWORD=@P0stgres$RANDOM
DB_SERVER_NAME=backstadeidpdb
CONTAINERAPPS_ENVIRONMENT=backstage-environment
AZURE_STORAGE_ACCOUNT=backstagestore
AZURE_STORAGE_CONTAINER=docs
IDENTITY_NAME=backstage-identity

### 0.Registrar una application en Microsoft Entra ID

```bash
source .env

az login --tenant $AZURE_TENANT_ID --allow-no-subscriptions --use-device-code

CLIENT_ID=$(az ad app create --display-name $RESOURCE_GROUP --web-redirect-uris http://localhost:7007/api/auth/microsoft/handler/frame --query appId -o tsv)

#Generate a secret for the app
CLIENT_SECRET=$(az ad app credential reset --id $CLIENT_ID --query password -o tsv)

# Add the following API Permissions:
# Microsoft Graph:
# - User.Read
# - User.Read.All
# profile
# offline_access
# email
# openid
# GroupMember.Read.All

# https://learn.microsoft.com/en-us/graph/permissions-reference
az ad app permission add --id $CLIENT_ID --api 00000003-0000-0000-c000-000000000000 --api-permissions e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope # User.Read
az ad app permission add --id $CLIENT_ID --api 00000003-0000-0000-c000-000000000000 --api-permissions 37f7f235-527c-4136-accd-4a02d197296e=Scope # openid
az ad app permission add --id $CLIENT_ID --api 00000003-0000-0000-c000-000000000000 --api-permissions 64a6cdd6-aab1-4aaf-94b8-3cc8405e90d0=Scope # email
az ad app permission add --id $CLIENT_ID --api 00000003-0000-0000-c000-000000000000 --api-permissions 7427e0e9-2fba-42fe-b0c0-848c9e6a8182=Scope # offline_access
az ad app permission add --id $CLIENT_ID --api 00000003-0000-0000-c000-000000000000 --api-permissions 14dad69e-099b-42c9-810b-d002981feec1=Scope # profile

az ad app permission add --id $CLIENT_ID --api 00000003-0000-0000-c000-000000000000 --api-permissions df021288-bdef-4463-88db-98f22de89214=Role # User.Read.All
az ad app permission add --id $CLIENT_ID --api 00000003-0000-0000-c000-000000000000 --api-permissions 98830695-27a2-44f7-8c18-0c3ebc9698f6=Role # GroupMember.Read.All

# Wait for the permissions to be granted
sleep 30

# Grant admin consent
az ad app permission admin-consent --id $CLIENT_ID