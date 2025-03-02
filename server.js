// Packages ---------------------------------------------------------------//---------------------------
import express from 'express';
// import { Sequelize, DataTypes, INTEGER } from 'sequelize';
import cookieParser from 'cookie-parser';
import client from 'prom-client';
import amqp from 'amqplib';

// DevTools ---------------------------------------------------------------//---------------------------

// import dotenv from 'dotenv';
// dotenv.config();
// Dev Project Commands
// npm install dotenv
// npm remove dotenv

const rabbitMQUrl = process.env.RABBITMQ_URL;

const signupQueue = process.env.SIGNUP_QUEUE;
const loginQueue = process.env.LOGIN_QUEUE;
const jwtQueue = process.env.JWT_QUEUE;
const chatQueue = process.env.CHAT_QUEUE;
const userQueue = process.env.USER_QUEUE;
const emailQueue = process.env.EMAIL_QUEUE;
const postsQueue = process.env.POSTS_QUEUE;
const deleteQueue = process.env.DELETE_QUEUE;
const allPostsQueue = process.env.ALLPOSTS_QUEUE;

const app = express()
const PORT = 9000
const HOST = '0.0.0.0';

// DevTools --------------------------------------------------------------//---------------------------
// const cors_url = process.env.CORS_URL;
// app.use((req, res, next) => {
//   res.set('Access-Control-Allow-Origin', `${cors_url}`);
//   res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//   res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//   res.set('Access-Control-Allow-Credentials', 'true'); // Allow credentials
//   res.set('Vary', 'Origin'); // Add the Vary header
//   next(); // Proceed to the next middleware or route handler
// });

// Application Configuration --------------------------------------------//----------------------------
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Create a custom gauge metric example (modify as needed)
const requestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
});
app.use((req, res, next) => {
  requestCounter.inc();
  next();
});
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// Set the MIME type for JavaScript files
app.set('view engine', 'js');
app.engine('js', (_, options, callback) => {
    callback(null, options.source);
});
// Start The App
app.listen(PORT, HOST, () => {
    console.log(`Server has started on http://${HOST}:${PORT}`)
})

// // Rabbitmq Queued ----------------------------------------------------------------//--------------------
// Authentication 
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(rabbitMQUrl);
    const channel = await connection.createChannel();

    // Ensure queue exists
    await channel.assertQueue(signupQueue, { durable: true });

    // Create a temporary reply queue
    const { queue: replyQueue } = await channel.assertQueue('', { exclusive: true });
    // Publish message to the queue
    const correlationId = Math.random().toString();

    const message = JSON.stringify({ email, password });
    channel.sendToQueue(signupQueue, Buffer.from(message), {
      replyTo: replyQueue,
      correlationId,
    });

    // Wait for a response on the reply queue
    channel.consume(
      replyQueue,
      (msg) => {
        if (msg.properties.correlationId === correlationId) {
          const response = JSON.parse(msg.content.toString());
          res.status(response.status).json(response); // Send the response back to the client
          channel.close(); // Close the channel
          connection.close(); // Close the connection
        }
      },
      { noAck: true }
    );
  } catch (error) {
    console.error('Error while publishing to RabbitMQ:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

app.post('/jwtDecode', async (req, res) => {
  const token = req.body.token;
  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(rabbitMQUrl);
    const channel = await connection.createChannel();

    // Ensure queue exists
    await channel.assertQueue(jwtQueue, { durable: true });

    // Create a temporary reply queue
    const { queue: replyQueue } = await channel.assertQueue('', { exclusive: true });
    // Publish message to the queue
    const correlationId = Math.random().toString();

    const message = JSON.stringify({ token });
    channel.sendToQueue(jwtQueue, Buffer.from(message), {
      replyTo: replyQueue,
      correlationId,
    });

    // Wait for a response on the reply queue
    channel.consume(
      replyQueue,
      (msg) => {
        if (msg.properties.correlationId === correlationId) {
          const response = JSON.parse(msg.content.toString());
          res.status(response.status).json(response); // Send the response back to the client
          channel.close(); // Close the channel
          connection.close(); // Close the connection
        }
      },
      { noAck: true }
    );
  } catch (error) {
    console.error('Error while publishing to RabbitMQ:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
})

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(rabbitMQUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue(loginQueue, { durable: true });
    // Create a temporary reply queue
    const { queue: replyQueue } = await channel.assertQueue('', { exclusive: true });
    const correlationId = Math.random().toString();
    const message = JSON.stringify({ email, password });
    // Publish Message to Queue
    channel.sendToQueue(loginQueue, Buffer.from(message), {
      replyTo: replyQueue,
      correlationId,
    });
    // Wait for a response on the reply queue
    channel.consume(
      replyQueue,
      (msg) => {
        if (msg.properties.correlationId === correlationId) {
          const response = JSON.parse(msg.content.toString());
          res.status(response.status).json(response); // Send the response back to the client
          channel.close(); // Close the channel
          connection.close(); // Close the connection
        }
      },
      { noAck: true }
    );
  } catch (error) {
    console.error('Error while publishing to RabbitMQ:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
  // --------------------------------------------------------------------------------------------
});

// User Operations
app.post('/chat', async (req, res) => {
  const question = req.body;
  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(rabbitMQUrl);
    const channel = await connection.createChannel();

    // Ensure queue exists
    await channel.assertQueue(chatQueue, { durable: true });

    // Create a temporary reply queue
    const { queue: replyQueue } = await channel.assertQueue('', { exclusive: true });
    // Publish message to the queue
    const correlationId = Math.random().toString();

    const message = JSON.stringify({ question });
    channel.sendToQueue(chatQueue, Buffer.from(message), {
      replyTo: replyQueue,
      correlationId,
    });

    // Wait for a response on the reply queue
    channel.consume(
      replyQueue,
      (msg) => {
        if (msg.properties.correlationId === correlationId) {
          const response = JSON.parse(msg.content.toString());
          res.status(response.status).json(response); // Send the response back to the client
          channel.close(); // Close the channel
          connection.close(); // Close the connection
        }
      },
      { noAck: true }
    );
  } catch (error) {
    console.error('Error while publishing to RabbitMQ:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
})

app.get('/api/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(rabbitMQUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue(userQueue, { durable: true });
    // Create a temporary reply queue
    const { queue: replyQueue } = await channel.assertQueue('', { exclusive: true });
    const correlationId = Math.random().toString();
    const message = JSON.stringify({ userId });
    // Publish Message to Queue
    channel.sendToQueue(userQueue, Buffer.from(message), {
      replyTo: replyQueue,
      correlationId,
    });
    // Wait for a response on the reply queue
    channel.consume(
      replyQueue,
      (msg) => {
        if (msg.properties.correlationId === correlationId) {
          const response = JSON.parse(msg.content.toString());
          res.status(response.status).json(response); // Send the response back to the client
          channel.close(); // Close the channel
          connection.close(); // Close the connection
        }
      },
      { noAck: true }
    );
  } catch (error) {
    console.error('Error while publishing to RabbitMQ:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

app.post('/email', async (req, res) => {
  const booking = req.body.formDataObject
  // console.log(booking)
  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(rabbitMQUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue(emailQueue, { durable: true });
    // Create a temporary reply queue
    const { queue: replyQueue } = await channel.assertQueue('', { exclusive: true });
    const correlationId = Math.random().toString();
    const message = JSON.stringify(booking);
    // Publish Message to Queue
    channel.sendToQueue(emailQueue, Buffer.from(message), {
      replyTo: replyQueue,
      correlationId,
    });
    // Wait for a response on the reply queue
    channel.consume(
      replyQueue,
      (msg) => {
        if (msg.properties.correlationId === correlationId) {
          const response = JSON.parse(msg.content.toString());
          res.status(response.status).json(response); // Send the response back to the client
          channel.close(); // Close the channel
          connection.close(); // Close the connection
        }
      },
      { noAck: true }
    );
  } catch (error) {
    console.error('Error while publishing to RabbitMQ:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

app.post('/api', async (req, res) => {
  const data = req.body.data;
  try {
    // Connect to RabbitMQ
    console.log(data);
    const connection = await amqp.connect(rabbitMQUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue(postsQueue, { durable: true });
    // Create a temporary reply queue
    const { queue: replyQueue } = await channel.assertQueue('', { exclusive: true });
    const correlationId = Math.random().toString();
    const message = JSON.stringify(data);
    // Publish Message to Queue
    channel.sendToQueue(postsQueue, Buffer.from(message), {
      replyTo: replyQueue,
      correlationId,
    });
    // Wait for a response on the reply queue
    channel.consume(
      replyQueue,
      (msg) => {
        if (msg.properties.correlationId === correlationId) {
          const response = JSON.parse(msg.content.toString());
          res.status(response.status).json(response); // Send the response back to the client
          channel.close(); // Close the channel
          connection.close(); // Close the connection
        }
      },
      { noAck: true }
    );
  } catch (error) {
    console.error('Error while publishing to RabbitMQ:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }

});

app.delete('/api/:id', async (req, res) => {
  const postId = req.params.id;
  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(rabbitMQUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue(deleteQueue, { durable: true });
    // Create a temporary reply queue
    const { queue: replyQueue } = await channel.assertQueue('', { exclusive: true });
    const correlationId = Math.random().toString();
    const message = JSON.stringify({ postId });
    // Publish Message to Queue
    channel.sendToQueue(deleteQueue, Buffer.from(message), {
      replyTo: replyQueue,
      correlationId,
    });
    // Wait for a response on the reply queue
    channel.consume(
      replyQueue,
      (msg) => {
        if (msg.properties.correlationId === correlationId) {
          const response = JSON.parse(msg.content.toString());
          res.status(response.status).json(response); // Send the response back to the client
          channel.close(); // Close the channel
          connection.close(); // Close the connection
        }
      },
      { noAck: true }
    );
  } catch (error) {
    console.error('Error while publishing to RabbitMQ:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

app.get('/allPosts', async (req, res) => {
  try {
    // const data = "";
    // Connect to RabbitMQ
    const connection = await amqp.connect(rabbitMQUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue(allPostsQueue, { durable: true });
    // Create a temporary reply queue
    const { queue: replyQueue } = await channel.assertQueue('', { exclusive: true });
    const correlationId = Math.random().toString();
    // const message = JSON.stringify(data);
    // Publish Message to Queue
    channel.sendToQueue(allPostsQueue, Buffer.from(JSON.stringify({})), {
      replyTo: replyQueue,
      correlationId,
    });
    // Wait for a response on the reply queue
    channel.consume(
      replyQueue,
      (msg) => {
        if (msg.properties.correlationId === correlationId) {
          const response = JSON.parse(msg.content.toString());
          res.status(response.status).json(response); // Send the response back to the client
          channel.close(); // Close the channel
          connection.close(); // Close the connection
        }
      },
      { noAck: true }
    );
  } catch (error) {
    console.error('Error while publishing to RabbitMQ:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});


// // Non Queued --------------------------------------------------------------------//---------------------
// Metrics Endpoints ---------------------------------------------------------------//-----------------
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
app.get('/health', (req, res) => {
  const message = "Healthy!";
  res.status(200).json({ info: message })
});
app.get('/ready', (req, res) => {
  const message = "Ready!";
  res.status(200).json({ info: message })
});

// ---------------------------------------------------------------------------------//-----------------
// ---------------------------------------------------------------------------------//-----------------