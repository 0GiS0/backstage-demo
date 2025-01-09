const express = require('express');
const morgan = require('morgan');
const app = express();
require('dotenv').config();

app.use(morgan('combined'));
app.use(express.json());

const PORT = process.env.PORT || 3000;



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
    "howManyCharacters": {
     "type": "number",     
      "description": "The number of Dragon Ball characters to retrieve"
    }
  }
}
*/

app.post('/components', async (req, res) => {

  console.log('Request body: ', req.body);
  
  let result = await fetch(`http://localhost:7007/api/catalog/entities/by-query?filter=kind=user`);

  result = await result.json();

  res.json(result);

});