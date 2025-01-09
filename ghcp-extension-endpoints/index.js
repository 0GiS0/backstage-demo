const express = require('express');
const morgan = require('morgan');
const app = express();
require('dotenv').config();

app.use(morgan('combined'));
app.use(express.json());

const PORT = process.env.PORT || 4000;

const BACKSTAGE_URL = process.env.BACKSTAGE_URL || 'http://app:7007/api';

/*
* Inference Description:
It allows us to retrieve all components registered in Backstage.
*/

/* JSON schema
{
  "type": "object",
  "properties": {
    "kind": {
      "type": "string",
      "default": "component",
      "description": "The kind of entity to search for in Backstage."

    },
    "name": {
      "type": "string",
      "description": "The name of the entity to search for in Backstage."
    },
    "owner": {
      "type": "string",
      "description": "The owner of the entity to search for in Backstage."
    }
  }
}
*/

app.post('/components', async (req, res) => {

  console.log('Request body: ', req.body);

  const params = {
    kind: req.body.kind || 'component',
    name: req.body.name,
    owner: req.body.owner
  };

  // Construir la URL con los parámetros disponibles
  let query = `filter=kind=${params.kind}`;
  if (params.name) {
    query += `&filter=metadata.name=${params.name}`;
  }
  if (params.owner) {
    query += `&filter=spec.owner=${params.owner}`;
  }

  console.log('Query: ', query);

  let result = await fetch(`${BACKSTAGE_URL}/catalog/entities/by-query?${query}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer hJH1SgtEaLHIMREu3W+xZqa1i/kqslzx'
    }
  });

  result = await result.json();

  res.json(result);

});


/* Inference Description: 
  This endpoint allows us to create a new repository using Backstage.
*/

/* JSON schema
{
  "type": "object",
  "properties": {
    "templateRef": { "type": "string", "description": "Is the value of the property metadata.name of the component with type Template" },
    "values": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "description": { "type": "string" },
        "owner": { "type": "string" },
        "repoUrl": { "type": "string" },
        "system": { "type": "string" }
      },
      "required": ["name", "description", "owner", "repoUrl", "system"]
    }
  },
  "required": ["templateRef", "values"]
}
*/

app.post('/create_repo', async (req, res) => {

  console.log('Request body: ', req.body);

  const params = {
    templateRef: req.body.templateRef,
    values: {
      name: req.body.values.name,
      description: req.body.values.description,
      owner: req.body.values.owner,
      repoUrl: `github.com?owner=${req.body.values.owner}&repo=${req.body.values.name}`,
      system: req.body.values.system
    }
  };

  console.log('Parameters: ', params);


  // The first call requests a new repository to be created
  let result = await fetch(`${BACKSTAGE_URL}/scaffolder/v2/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer hJH1SgtEaLHIMREu3W+xZqa1i/kqslzx'
    },
    body: JSON.stringify(params)
  });

  console.log(`Status code for the first call: ${result.status}`);
  console.log(`Error for the first call: ${result.error}`);

  result = await result.json(); // It returns the task ID

  console.log('Task ID: ', result.id);

  // Check the status of the task to know when it is completed
  let status = 'completed';

  while (status !== 'completed') {
    let task = await fetch(`${BACKSTAGE_URL}/scaffolder/v2/tasks/${result.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer hJH1SgtEaLHIMREu3W+xZqa1i/kqslzx'
      }
    });

    task = await task.json();

    status = task.status;

    console.log('Task status: ', status);

    if (status === 'failed') {
      console.log('Task failed');
      break;
    }

  }

  console.log('Task completed successfully');

  res.json(result);

});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} 🚀`);
});
