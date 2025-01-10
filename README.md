# Backstage demo

¡Hola developer 👋🏻! Este branch contiene todo lo que necesitas para probar cómo puedes integrar GitHub Copilot con Backstage. Puedes verlo en funcionamiento en el vídeo que publiqué en mi canal de YouTube:

Para esta demo tengo dos directorios principales:

- `backstage`: el cual contiene una instancia de Backstage que tiene configurado el discovery de entidades en repositorios en GitHub, con mi cuenta personal como ejemplo, además de la configuración necesaria para que mis Software Templates funcionen correctamente, como ya te conté en este otro vídeo. También he modificado el archivo `app-config-local.yaml`con todo lo necesario para que funcione esta configuración:

```yaml
# Backstage override configuration for your local development environment
auth:
  # see https://backstage.io/docs/auth/ to learn about auth providers
  environment: development
  providers:
    guest: {}
    github:
      development:
        clientId: <YOUR_CLIENT_ID>
        clientSecret: <YOUR_CLIENT_SECRET>
        signIn:
          resolvers:
            - resolver: usernameMatchingUserEntityName
integrations:
  github:
    - host: github.com
      # This is a Personal Access Token or PAT from GitHub. You can find out how to generate this token, and more information
      # about setting up the GitHub integration here: https://backstage.io/docs/integrations/github/locations#configuration
      token: github_pat_XX
backend:
  auth:
    externalAccess:
      - type: static
        options:
          token: <YOUR_TOKEN_HERE>
          subject: rest-client-token
```

Las configuración en la sección `auth` nos permiten autenticarnos con GitHub, como ya te mostré en el vídeo XXXX, la sección `integrations`le va a permitir al scaffolder poder crear los repositorios que le solicitemos y la sección `backend > auth`nos permite añadir un token con el que vamos a poder interactuar con la API de Backstage.

Para crear el token para este útlimo paso he lanzado simplemente este comando:

```bash
node -p 'require("crypto").randomBytes(24).toString("base64")'
```

El cuál lo he obtenido de [la documentación oficial](https://backstage.io/docs/auth/service-to-service-auth/#static-tokens) y es suficiente para este ejemplo.


Una vez que tienes configurado este archivo, para poder ejecutar este proyecto bastan con lanzar estos dos comandos:

```bash
cd backstage
yarn install
yarn dev
```

- `ghcp-extension-endpoints`: Este otro repositorio contiene los endpoints necesarios para que GitHub Copilot pueda interactuar con Backstage. Este proyecto, en su archivo `.env`debe almacenar el token que hemos creado en el paso anterior. Para poder ejecutar este proyecto bastan con lanzar estos dos comandos:

```bash
cd ghcp-extension-endpoints
npm install
npm start
```

Por otro lado, debemos también lanzar ngrok para que GitHub Copilot pueda llegar a nuestro servidor local. Para ello, simplemente lanzamos este comando:

```bash
ngrok http 4000
```

La configuración de estos endpoints en la GitHub App que se hará de Github Copilot extensión puedes verla en este otro vídeo que publiqué en mi canal de YouTube.


## Cómo interactuar con el agente

Para esta demo el agente es capaz de hacer dos cosas fundamentales:

1. Buscar y/o indentificar entidades en Backstage tomando como referencia el repositorio donde nos encontramos (tenemos como contexto)

2. Crear repositorios en GitHub usando una Software Template

### Cómo interactuar con el agente para buscar entidades

Puede ser interesante saber qué sabe Backstage del repositorio donde nos encontramos. Para ello, simplemente debemos lanzar este comando:

```bash
@backstage-helper @backstage-helper ¿Qué entidades tienes en este repositorio?
```

### Cómo interactuar con el agente para pedirle crear un repositorio usando una Software Template

1. `@backstage-helper @backstage-helper quiero crear un repositorio ¿Qué plantillas tengo?`
2. `@backstage-helper ok estos son los datos name: "nombre-del-repositorio" description: "descripción-del-repositorio" owner: yo, system: "github-copilot"`
