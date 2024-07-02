#!/usr/bin/env bash

minikube start

kubectl apply -f backstage/k8s-manifests/dice-roller-manifests.yaml

echo "Get MINIKUBE URL"

MINIKUBE_URL=$(kubectl cluster-info | grep "Kubernetes control plane" | awk '{print $NF}' | sed 's/\x1b\[[0-9;]*m//g')

echo "MINIKUBE URL: $MINIKUBE_URL"

MINIKUBE_TOKEN=$(kubectl get secret dice-roller-token -o go-template='{{.data.token | base64decode}}')

echo "Exporting MINIKUBE URL and TOKEN to .env file"

echo "MINIKUBE_URL=$MINIKUBE_URL" >> .env
echo "MINIKUBE_TOKEN=$MINIKUBE_TOKEN" >> .env

direnv hook bash >> ~/.bashrc

direnv allow

# Install kubelogin
asdf plugin add kubelogin
asdf install kubelogin latest
asdf global kubelogin latest