import express from 'express';
// import Datastore from 'nedb';
import fetch from 'node-fetch';
// import cors from 'cors';
import sgMail from '@sendgrid/mail';
import { Sequelize, DataTypes, INTEGER } from 'sequelize';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
// import cors from 'cors';

const pgDb = process.env.POSTGRES_DB;
const pgUser = process.env.POSTGRES_USER;
const pgPass = process.env.POSTGRES_PASSWORD;
const pgHost = process.env.DB_HOST;
const JWT_SECRET = process.env.JWT_SECRET;
const admin_email = process.env.ADMIN_EMAIL;

// Initialize Sequelize with your database connection
const sequelize = new Sequelize(`${pgDb}`, `${pgUser}`, `${pgPass}`, {host: `${pgHost}`, port: 5432, dialect: 'postgres', dialectOptions: {connectTimeout: 60000}});

sequelize.authenticate().then(() => {
  console.log('Connection has been established successfully.');
}).catch(err => {
  console.log('Unable to connect to the database:', err);
});

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

const app = express()
const PORT = 9000
const HOST = '0.0.0.0';

// app.use(cors());

// const corsOptions = {
//   origin: 'http://localhost:3000', // Replace with your frontend domain
//   optionsSuccessStatus: 200,
//   methods: ['GET', 'POST'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// };

// app.use(cors(corsOptions));

// Set the MIME type for JavaScript files
app.set('view engine', 'js');
app.engine('js', (_, options, callback) => {
    callback(null, options.source);
});

app.use(express.json({ limit: '1mb' }));

app.listen(PORT, HOST, () => {
    console.log(`Server has started on http://${HOST}:${PORT}`)
})

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {      
      const record = await usersTable.findOne({ where: { email: email } });
      // var userExists = record.email === email;
      // console.log(userExists);
      // let boolUserExists = Boolean(userExists);
      // if (userExists === true) {
      //   userExists = false;
      // }
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
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.email;  // This depends on how the token was signed
    const record = await usersTable.findOne({ where: { email: userId } });
    const id = record._id;
    console.log(id)
    return res.json({ message: 'User ID Found', id });

  } catch (error) {
    // If an error occurs, respond with an error message
    console.error('Error Decoding:', error);
    res.status(500).json({ message: 'Error Decoding' });
  }
})
// app.get('/check-auth', (req, res) => {
//   const token = req.cookies.authToken; // Get token from cookie
//   if (!token) {
//       return res.status(401).json({ isAuthenticated: false, message: 'Unauthorized: No token provided' });
//   }
//   try {
//       const verified = jwt.verify(token, JWT_SECRET); // Verify the token
//       return res.json({ isAuthenticated: true, user: verified });
//   } catch (err) {
//       return res.status(401).json({ isAuthenticated: false, message: 'Unauthorized: Invalid token' });
//   }
// });
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
// const db = new Datastore('./db/drawings.db');
// db.loadDatabase();
// #######################################################################
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
    
        // Retrieve all records from the database
        const records = await postsTable.findAll({ where: { userId: userId } });
    
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
app.post('/email', (req, res) => {
    const key = process.env.api_email_key
    sgMail.setApiKey(key)
    const booking = req.body.formDataObject
    console.log(req.body.formDataObject.name)
    const msg = {
        from: `${admin_email}`,
        to: booking.email,
        subject: `Booking for ${booking.email} on ${booking.date} at ${booking.time}`,
        text: `Your booking has been confirmed and we have noted your message: "${booking.message}"`,
        html: `
            <p>Hello ${booking.name}, your booking request has been sent!</p>
            <p>Date: ${booking.date}</p>
            <p>Time: ${booking.time}</p>
            <p>Contact: ${admin_email}</p>
            <p>Your message: ${booking.message}</p>
        `    
    };
    sgMail
      .send(msg)
      .then(() => {
        console.log('Email sent')
      })
      .catch((error) => {
        console.error(error)
      })
    const reciept = {
        from: `${admin_email}`,
        to: `${admin_email}`,
        subject: `Booking for ${booking.name} on ${booking.date} at ${booking.time}`,
        text: `Booking has been requested by ${booking.name}!Contact Email'
        we have noted your message: ${booking.message}`,
        html: `
            <p>Hello booking has been  ${booking.name},</p>
            <p>This is a test email sent from Node.js using SendGrid.</p>
            <p>Date: ${booking.date}</p>
            <p>Time: ${booking.time}</p>
            <p>Contact: ${booking.email}</p>
            <p>Message: ${booking.message}</p>
        `
    };
    sgMail
    .send(reciept)
    .then(() => {
      console.log('Email sent')
    })
    .catch((error) => {
      console.error(error)
    })
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
    // db.remove({ _id: postId }, {}, (err, numRemoved) => {
    //     if (err) {
    //         console.error(`Error deleting post with ID ${postId}.`, err);
    //         res.status(500).send(`Error deleting post with ID ${postId}.`);
    //     } else {
    //         console.log(`Post with ID ${postId} deleted.`);
    //         res.sendStatus(200);
    //     }
    // });
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

