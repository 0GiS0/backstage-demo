# Backstage demo

Hi developer 👋🏻! This is my playground around Backstage in order to learn how to configure the different features and integrations we can have for this IDP.

In order to configure minikube you need this

```
kubectl cluster-info

kubectl apply -f k8s-manifests

kubectl get secret dice-roller-token -o go-template='{{.data.token | base64decode}}'
```

