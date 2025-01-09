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
This API retrieves Dragon Ball characters from an external API and returns the data in JSON format. 
Input: a JSON object with an optional parameter: howManyCharacters. 
Output: a JSON array with the details of the requested characters.
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} 🚀`);
});
