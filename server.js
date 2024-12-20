import express from 'express';
import fetch from 'node-fetch';
import sgMail from '@sendgrid/mail';
import { Sequelize, DataTypes, INTEGER } from 'sequelize';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import client from 'prom-client';
// DevTools ------------------------------------------- //
// import dotenv from 'dotenv';
// dotenv.config();
// ---------------------------------------------------- //
// ---------------------------------------------------- //

const pgDb = process.env.POSTGRES_DB;
const pgUser = process.env.POSTGRES_USER;
const pgPass = process.env.POSTGRES_PASSWORD;
const pgHost = process.env.DB_HOST;
const JWT_SECRET = process.env.JWT_SECRET;
const admin_email = process.env.ADMIN_EMAIL;
const key = process.env.EMAIL_KEY;
const app = express()
const PORT = 9000
const HOST = '0.0.0.0';

// DevTools ------------------------------------------- //
// const cors_url = process.env.CORS_URL;
// app.use((req, res, next) => {
//   res.set('Access-Control-Allow-Origin', `${cors_url}`);
//   res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//   res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//   res.set('Access-Control-Allow-Credentials', 'true'); // Allow credentials
//   res.set('Vary', 'Origin'); // Add the Vary header
//   next(); // Proceed to the next middleware or route handler
// });
// ---------------------------------------------------- //
// ---------------------------------------------------- //

// Register a default metrics registry
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

app.listen(PORT, HOST, () => {
    console.log(`Server has started on http://${HOST}:${PORT}`)
})

// Initialize Sequelize with your database connection
// const sequelize = new Sequelize(`${pgDb}`, `${pgUser}`, `${pgPass}`, {host: `${pgHost}`, port: 5432, dialect: 'postgres', dialectOptions: {connectTimeout: 60000}});
// sequelize.authenticate().then(() => {
//   console.log('Connection has been established successfully.');
// }).catch(err => {
//   console.log('Unable to connect to the database:', err);
// });

const sequelize = new Sequelize(`${pgDb}`, `${pgUser}`, `${pgPass}`, {
  host: `${pgHost}`,
  port: 5432,
  dialect: 'postgres',
  dialectOptions: { connectTimeout: 60000 }
});

const connectWithRetry = async () => {
  while (true) {
    try {
      await sequelize.authenticate();
      console.log('Connection has been established successfully.');
      break; // Exit the loop if connection is successful
    } catch (err) {
      console.error('Unable to connect to the database:', err);
      console.log('Retrying in 5 seconds...'); // Log retry message
      await new Promise(res => setTimeout(res, 5000)); // Wait for 5 seconds before retrying
    }
  }
};

connectWithRetry();

const postsTable = sequelize.define('posts', {
  _id: {
    type: DataTypes.INTEGER,
    primaryKey: true, // Set _id as the primary key
    autoIncrement: true // Enable auto-increment
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  mood: {
    type: DataTypes.STRING,
    allowNull: false
  },
  image64: {
    type: DataTypes.TEXT
  }
});
const usersTable = sequelize.define('users', {
  _id: {
    type: DataTypes.INTEGER,
    primaryKey: true, // Set _id as the primary key
    autoIncrement: true // Enable auto-increment
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.TEXT
  }
});
// Sync the model with the database (create the table if it doesn't exist)
sequelize.sync({ alter: false }).then(() => {
  console.log('Table created successfully.');
}).catch(err => {
  console.error('Error creating table:', err);
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {      
      const record = await usersTable.findOne({ where: { email: email } });
      if (record) {
        return res.status(409).json({ message: 'User Already Exists' });
      }
      const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds
      const newUser = await usersTable.create({
          email: email,
          password: hashedPassword
      });
      return res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'An error occurred while creating the user' });
  }
});
app.post('/jwtDecode', async (req, res) => {
  try {
    // console.log(req.body.token)
    const token = req.body.token;
    // const token = req.body.token;
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.email;  // This depends on how the token was signed
    const record = await usersTable.findOne({ where: { email: userId } });
    const id = record._id;
    return res.json({ message: 'User ID Found', id });
  } catch (error) {
    console.error('Error Decoding:', error);
    res.status(500).json({ message: 'Error Decoding' });
  }
})
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const record = await usersTable.findOne({ where: { email: email } });

    if (!record) {
      return res.status(404).json({ message: 'No such user exists!' });
    }
    const hashedPassword = record.password;
    // console.log(hashedPassword)

    bcrypt.compare(password, hashedPassword, (error, isMatch) => {
      if (error) {
        console.error("Error comparing passwords:", error);
        return res.status(500).json({ error: 'Error checking user password.' });
      }
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid password' });
      }
      const token = jwt.sign({ id: record.id, email: record.email }, JWT_SECRET, { expiresIn: '1h' });
      res.cookie('token', token, { path: '/', httpOnly: true, maxAge: 3600000 });
      return res.json({ message: 'Login successful', token });
    });
  } catch (error) {
    console.error('Error Logging In!', error);
    res.status(500).json({ message: 'User Does Not Exist!' });
  }
});
app.post('/chat', (req, res) => {
    const apiKey = process.env.api_key_chat;
    const question = req.body;
    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(question)
    };
    fetch('https://api.openai.com/v1/chat/completions', options)
        .then(response => {
            if (response.ok) {
                // return response.json();
                return response.json()
            } else {
                throw new Error('Error: ' + response.status);
            }
        })
        .then(data => {
            res.status(200).json(data); // Send the response to the requester
        })
        .catch(error => {
            res.status(500).json({ error: error.message }); // Handle any errors and send an error response
        });
})
app.get('/api/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        const records = await postsTable.findAll({ where: { userId: userId } });
        const data = records.map(record => record.toJSON());
        res.json(data);
      } catch (error) {
        console.error('Error retrieving records:', error);
        res.status(500).json({ error: 'Error retrieving records' });
      }
});
app.post('/email', (req, res) => {
    sgMail.setApiKey(`${key}`)
    const booking = req.body.formDataObject
    if (!booking.email || !booking.name || !booking.date || !booking.time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const msg = {
        from: admin_email,
        to: booking.email,
        subject: `Booking for ${booking.name} has been confirmed for ${booking.date}`,
        text: `Please arrive at at ${booking.time}`,
        html: `
            <p>Hello ${booking.name}, your booking request has been sent!</p>
            <p>Date: ${booking.date}</p>
            <p>Time: ${booking.time}</p>
            <p>Contact: ${admin_email}</p>
            <p>Your message: ${booking.message}</p>
        `
    };
    const reciept = {
        from: admin_email,
        to: admin_email,
        subject: `Booking request for ${booking.name} on ${booking.date} at ${booking.time}`,
        text: `Booking has been requested by ${booking.name}`,
        html: `
            <p>Hello booking has been  ${booking.name},</p>
            <p>This is a test email sent from Node.js using SendGrid.</p>
            <p>Date: ${booking.date}</p>
            <p>Time: ${booking.time}</p>
            <p>Contact: ${booking.email}</p>
            <p>Message: ${booking.message}</p>
        `
    };
    Promise.all([
      sgMail.send(msg),
      sgMail.send(reciept)
    ])
    .then(() => {
        console.log('Emails sent successfully');
        res.status(200).json({ message: 'Emails sent' });
    })
    .catch((error) => {
        console.error('Error sending emails:', error.response.body);
        res.status(500).json({ error: 'Failed to send emails' });
    });
});
app.post('/api', async (req, res) => {
    try {        
        // Parse request body to extract mood and image64
        const data = req.body.data;
        const mood = data.mood;
        const image64 = data.image64;
        const id = data.id;
        const timestamp = Date.now();
        // const { mood, image64, timestamp, id } = data;     
        const record = await postsTable.create({
          mood: mood,
          image64: image64,
          userId: id,
          timestamp: timestamp
        });
        // If successful, respond with the inserted record
        res.status(201).json(record);
      } catch (error) {
        // If an error occurs, respond with an error message
        console.error('Error inserting record:', error);
        res.status(500).json({ error: 'Error inserting record' });
      }
    // const data = req.body;
    // const timestamp = Date.now();

    // db.insert(data)
    // res.json(data);
});
app.delete('/api/:id', async (req, res) => {
    const postId = req.params.id;
    console.log(postId);

    try {
        // Find the record with the specified _id and delete it
        const record = await postsTable.findOne({ where: { _id: postId } });
        if (!record) {
          return res.status(404).json({ error: 'Record not found' });
        }
    
        await record.destroy();
    
        // Respond with a success message
        res.json({ message: 'Record deleted successfully' });
      } catch (error) {
        // If an error occurs, respond with an error message
        console.error('Error deleting record:', error);
        res.status(500).json({ error: 'Error deleting record' });
      }
});
app.get('/health', (req, res) => {
    const message = "Healthy!";
    res.status(200).json({ info: message })
})
app.get('/ready', (req, res) => {
    const message = "Ready!";
    res.status(200).json({ info: message })
})
app.get('/allPosts', async (req, res) => {
  try {
      // Retrieve all records from the database
      const records = await postsTable.findAll();
  
      // Store the retrieved records in a variable
      const data = records.map(record => record.toJSON());
  
      // Respond with the retrieved records
      res.json(data);
    } catch (error) {
      // If an error occurs, respond with an error message
      console.error('Error retrieving records:', error);
      res.status(500).json({ error: 'Error retrieving records' });
    }
  // db.find({}, (err, data) => {
  //     if (err) {
  //         res.end();
  //         return;
  //     }
  //     res.json(data);
  // });
});