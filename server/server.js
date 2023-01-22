import express from 'express'
import * as dotenv from 'dotenv'
import cors from 'cors'
import { Configuration, OpenAIApi } from 'openai'
import helmet from 'helmet'
import rateLimit from "express-rate-limit";
import winston from 'winston';
import Joi from 'joi';
const natural = require('natural');

dotenv.config()

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const app = express()
app.use(cors())
app.use(helmet());

// Initialize the conversation context variable
let conversationContext = "";
const tokenize = natural.WordTokenizer;

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later"
});
app.use("/", apiLimiter);

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

app.get('/', async (req, res) => {
  res.status(200).send({
    message: 'Ask Tiza!'
  })
})

app.use(express.json());
app.use((req, res, next) => {
    const { error } = validateInput(req.body);
    if (error) {
        res.status(400).send(error.details[0].message);
        return;
    }
    next();
});

app.post('/', async (req, res) => {
  try {
    const prompt = req.body.prompt;
    // Store the previous conversation context
    conversationContext = `${conversationContext} ${prompt}`;
    // tokenize the context and prompt
    let tokenizedContext = tokenize().tokenize(conversationContext);
    let tokenizedPrompt = tokenize().tokenize(prompt);

    // Use the previous conversation context in the prompt
    // more options to the createCompletion function to fine-tune the generated response.
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: conversationContext,
      temperature: 0.5, 
      max_tokens: 1000,
      top_p: 1, 
      frequency_penalty: 0.5,
      presence_penalty: 0,
      stop: ["end of conversation"]
    });
      conversationContext = `${conversationContext} ${response.data.choices[0].text}`;
      res.status(200).send({
      bot: response.data.choices[0].text
    });
    logger.log('info', 'Summary: ' + response.data.choices[0].text);
    } catch (error) {
        console.error(error)
        logger.log('error', error);
        res.status(500).send({error: 'Something went wrong'});
    }
    });

    // More endpoints to the server to perform more complex tasks, such as generating a summary of a text.
    app.post('/summary', async (req, res) => {
    try {
          const response = await openai.createCompletion({
          model: "text-davinci-002",
          prompt: req.body.text,
          temperature: 0.5,
          max_tokens: 1000,
          top_p: 1,
          frequency_penalty: 0.5,
          presence_penalty: 0,
    });
          res.status(200).send({
          summary: response.data.choices[0].text
    });
          logger.log('info', 'Summary: ' + response.data.choices[0].text);
    } catch (error) {
        console.error(error)
        logger.log('error', error);
        res.status(500).send({error: 'Something went wrong'});
    }

    });
    
        function validateInput(data) {
        const schema = {
        prompt: Joi.string().min(5).required()
    };
      return Joi.validate(data, schema);
    }
    
    app.listen(5000, () => console.log('AI server started on http://localhost:5000'))
