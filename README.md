# Backstage demo

Hi developer 👋🏻! This is my playground around Backstage in order to learn how to configure the different features and integrations we can have for this IDP. In this branch I will show you how you can install and configure the Kubernetes plugin.

## Install Kubernetes plugin

The first thing you need to do is to install the Kubernetes plugin in both, backend and front end.

### Front end

Add this plugin:

```bash
cd backstage
yarn --cwd packages/app add @backstage/plugin-kubernetes
```

And now, you have to modify [EntityPage.tsx](backstage/packages/app/src/components/catalog/EntityPage.tsx) in order to add a new section inside your components called Kubernetes:

```html
const serviceEntityPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      {overviewContent}
    </EntityLayout.Route>

    <EntityLayout.Route path="/ci-cd" title="CI/CD">
      {cicdContent}
    </EntityLayout.Route>

    <EntityLayout.Route path="/api" title="API">
      <Grid container spacing={3} alignItems="stretch">
        <Grid item md={6}>
          <EntityProvidedApisCard />
        </Grid>
        <Grid item md={6}>
          <EntityConsumedApisCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>

    <EntityLayout.Route path="/dependencies" title="Dependencies">
      <Grid container spacing={3} alignItems="stretch">
        <Grid item md={6}>
          <EntityDependsOnComponentsCard variant="gridItem" />
        </Grid>
        <Grid item md={6}>
          <EntityDependsOnResourcesCard variant="gridItem" />
        </Grid>
      </Grid>
    </EntityLayout.Route>

    <EntityLayout.Route path="/docs" title="Docs">
      {techdocsContent}
    </EntityLayout.Route>

    <EntityLayout.Route path="/kubernetes" title="Kubernetes">
      <EntityKubernetesContent refreshIntervalMs={30000} />
    </EntityLayout.Route>
  </EntityLayout>
  
);
```

[It's line 180 in my code ](backstage/packages/app/src/components/catalog/EntityPage.tsx#L180)🙂

### Backend

For the backend, you should install also a plugin:

```bash
yarn --cwd packages/backend add @backstage/plugin-kubernetes-backend
```

And add it to the [`index.tsx`](backstage/packages/backend/src/index.ts#47) file.

## Create AKS cluster

You have to log in first:

```bash
az login --use-device-code
```

Load some variables for Azure:

```bash
RESOURCE_GROUP="k8s-backstage"
AKS_CLUSTER_NAME="backstage-cluster"
LOCATION="spaincentral"
DEVS_GROUP_OBJECT_ID="562ed5c5-b4bc-4611-8be0-09a288fc2329"
```

Create a resource group:

```bash
az group create -n $RESOURCE_GROUP -l $LOCATION
```

And now create an AKS cluster:

```bash
az aks create \
--name $AKS_CLUSTER_NAME \
--resource-group $RESOURCE_GROUP \
--location $LOCATION \
--node-count 1 \
--node-vm-size Standard_B4ms \
--enable-aad \
--aad-admin-group-object-ids $DEVS_GROUP_OBJECT_ID \
--generate-ssh-keys
```

Get credentials:

```bash
az aks get-credentials -g $RESOURCE_GROUP -n $AKS_CLUSTER_NAME --overwrite-existing
```

Use kubelogin plugin for authentication:

```bash
kubelogin convert-kubeconfig -l azurecli
```


Check that it works:

```bash
kubectl get deployments --all-namespaces=true
```

Deploy tour of heroes app in this cluster:

```bash
kubectl apply -f backstage/k8s-manifests/tour-of-heroes --recursive
```

Get FQDN

```bash
echo "Your FQDN is: $(az aks show -g $RESOURCE_GROUP -n $AKS_CLUSTER_NAME --query "fqdn" -o tsv)"
```

Update kubernetes section with this one:

```yaml
kubernetes:
  serviceLocatorMethod:
    type: 'multiTenant'
  clusterLocatorMethods:
    - type: 'config'
      clusters:
        - url: ${MINIKUBE_URL}
          name: minikube
          authProvider: 'serviceAccount'
          skipTLSVerify: true
          skipMetricsLookup: true
          serviceAccountToken: ${MINIKUBE_TOKEN}
        - url: https://backstage--k8s-backstage-de-038239-srt0pdkp.hcp.spaincentral.azmk8s.io
          name: backstage-cluster
          authProvider: azure
          skipTLSVerify: true
```