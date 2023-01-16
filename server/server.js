import express from 'express'
import * as dotenv from 'dotenv'
import cors from 'cors'
import { Configuration, OpenAIApi } from 'openai'

dotenv.config()

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const app = express()
app.use(cors())
app.use(express.json())

// Initialize the conversation context variable
let conversationContext = "";

app.get('/', async (req, res) => {
  res.status(200).send({
    message: 'Ask Tiza!'
  })
})

app.post('/', async (req, res) => {
  try {
    const prompt = req.body.prompt;
    // Store the previous conversation context
    conversationContext = `${conversationContext} ${prompt}`;
    // Use the previous conversation context in the prompt
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: conversationContext,
      temperature: 0, 
      max_tokens: 1000,
      top_p: 1, 
      frequency_penalty: 0.5,
      presence_penalty: 0,
    });

    conversationContext = `${conversationContext} ${response.data.choices[0].text}`;
    res.status(200).send({
      bot: response.data.choices[0].text
    });

  } catch (error) {
    console.error(error)
    res.status(500).send(error || 'Something went wrong');
  }
})

app.listen(5000, () => console.log('AI server started on http://localhost:5000'))
