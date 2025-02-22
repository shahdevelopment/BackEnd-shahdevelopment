// Packages ------------------------------------------------------------------------------------//---------------------------
import amqp from 'amqplib';
import bcrypt from 'bcryptjs';
import { Sequelize, DataTypes, INTEGER } from 'sequelize';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import sgMail from '@sendgrid/mail';


// DevTools ------------------------------------------------------------------------------------//---------------------------
// import dotenv from 'dotenv';
// dotenv.config();
// Dev Project Commands
// - npm install dotenv
// - npm remove dotenv

// Variables ----------------------------------------------------------------------------------//----------------------------
const pgDb = process.env.POSTGRES_DB;
const pgUser = process.env.POSTGRES_USER;
const pgPass = process.env.POSTGRES_PASSWORD;
const pgHost = process.env.DB_HOST;

const rabbitMQUrl = process.env.RABBITMQ_URL;

const JWT_SECRET = process.env.JWT_SECRET;
const apiKey = process.env.api_key_chat;
const key = process.env.EMAIL_KEY;

const signupQueue = process.env.SIGNUP_QUEUE;
const loginQueue = process.env.LOGIN_QUEUE;
const jwtQueue = process.env.JWT_QUEUE;
const chatQueue = process.env.CHAT_QUEUE;
const userQueue = process.env.USER_QUEUE;
const emailQueue = process.env.EMAIL_QUEUE;
const postsQueue = process.env.POSTS_QUEUE;
const deleteQueue = process.env.DELETE_QUEUE;
const allPostsQueue = process.env.ALLPOSTS_QUEUE;

const admin_email = process.env.ADMIN_EMAIL;

// PostgreSQL Initialization ------------------------------------------------------------------//----------------------------
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


// RabbitMQ Listener Configuration ------------------------------------------------------------//----------------------------
const consumeMessages = async () => {
    try {

        // Connect to RabbitMQ
        const connection = await amqp.connect(rabbitMQUrl);
        const channel = await connection.createChannel();

        // Variables
        await channel.assertQueue(loginQueue, { durable: true });
        await channel.assertQueue(signupQueue, { durable: true });
        await channel.assertQueue(jwtQueue, {durable: true});
        await channel.assertQueue(chatQueue, {durable: true});
        await channel.assertQueue(userQueue, {durable: true});
        await channel.assertQueue(emailQueue, {durable: true});
        await channel.assertQueue(postsQueue, {durable: true});
        await channel.assertQueue(deleteQueue, {durable: true});
        await channel.assertQueue(allPostsQueue, {durable: true});

        // Signup ----------------------------------------------------------------------------- ||
        channel.consume(signupQueue, async (msg) => {
            if (msg !== null) {
                const { email, password } = JSON.parse(msg.content.toString());

                let response;
                try {
                    if (!validator.isEmail(email)) {
                        console.error('Invalid email format:', email);
                        response = { status: 400, message: 'Invalid email format' };
                    } else {
                        // Check if user exists
                        const record = await usersTable.findOne({ where: { email } });
                        if (record) {
                            response = { status: 409, message: `User with email ${email} already exists.` };
                        } else {
                            // Hash password and save user
                            const hashedPassword = await bcrypt.hash(password, 10);
                            await usersTable.create({ email, password: hashedPassword });
                            response = { status: 201, message: `User with email ${email} created successfully.` };
                        }
                    }
                } catch (dbError) {
                    console.error('Database error:', dbError);
                    response = { status: 500, message: 'Database error occurred' };
                }
                // Send response back to the reply-to queue
                channel.sendToQueue(
                    msg.properties.replyTo,
                    Buffer.from(JSON.stringify(response)),
                    { correlationId: msg.properties.correlationId }
                );
                // Acknowledge message
                channel.ack(msg);
            }
        });

        // Login ------------------------------------------------------------------------------ ||
        channel.consume(loginQueue, async (msg) => {
            if (msg !== null) {
                const { email, password } = JSON.parse(msg.content.toString());
                let response;
                try {
                    if (!validator.isEmail(email)) {
                        console.error('Invalid email format:', email);
                        response = { status: 400, message: 'Invalid email format' };
                    } else {
                        const record = await usersTable.findOne({ where: { email: email } });
                        if (!record) {
                            response = { status: 404, message: 'No such user exists!' };
                        } else {
                            const hashedPassword = record.password;
                            const isMatch = await bcrypt.compare(password, hashedPassword);
                            console.log(isMatch);
                            if (!isMatch) {
                                response = { status: 400, message: 'Invalid password' };
                            } else {
                                const token = jwt.sign({ id: record.id, email: record.email }, JWT_SECRET, { expiresIn: '1h' });
                                // res.cookie('token', token, { path: '/', httpOnly: true, maxAge: 3600000 });
                                response = { status: 200, message: 'Login successful', token };   
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error Logging In!', error);
                    // res.status(500).json({ message: 'User Does Not Exist!' });
                    response = { status: 500, message: 'User Does Not Exist!' };
                    channel.nack(msg, false, false);
                    return;
                }
                // Send response back to the reply-to queue
                channel.sendToQueue(
                    msg.properties.replyTo,
                    Buffer.from(JSON.stringify(response)),
                    { correlationId: msg.properties.correlationId }
                );
                // Acknowledge message
                channel.ack(msg);
            }
        });

        // JWT Verify ---------------------------------------------------------------------------- ||
        channel.consume(jwtQueue, async (msg) => {
            if (msg !== null) {
                const { token } = JSON.parse(msg.content.toString());
                let response;
                try {
                    // const token = req.body.token;
                    const decoded = jwt.verify(token, JWT_SECRET);
                    const userId = decoded.email;  // This depends on how the token was signed
                    const record = await usersTable.findOne({ where: { email: userId } });
                    const id = record._id;
                    response = {status: 200, message: 'User ID Found', id}
                } catch (error) {
                    response = { status: 500, message: 'Error Decoding' };
                    channel.nack(msg, false, false);
                    return;
                }
                // Send response back to the reply-to queue
                channel.sendToQueue(
                    msg.properties.replyTo,
                    Buffer.from(JSON.stringify(response)),
                    { correlationId: msg.properties.correlationId }
                );
                // Acknowledge message
                channel.ack(msg);
            }
        });

        // Chat GPT ------------------------------------------------------------------------------ ||
        channel.consume(chatQueue, async (msg) => {
            if (msg !== null) {

                const { question } = JSON.parse(msg.content.toString());
                let response;
                try {
                    // const token = req.body.token;
                    const options = {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(question)
                    };
                    const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', options);

                    if (!apiResponse.ok) {
                        throw new Error(`Error: ${apiResponse.status}`);
                    }
                    const data = await apiResponse.json();
                    const assistantMessage = data.choices[0]?.message?.content || "No response from AI.";

                    response = { status: 200, message: assistantMessage }; // Send only the text
                } catch (error) {
                    response = { status: 500, message: error.message };
                    channel.nack(msg, false, false); // Reject message
                    return;
                }
                // Send response back to the reply-to queue
                channel.sendToQueue(
                    msg.properties.replyTo,
                    Buffer.from(JSON.stringify(response)),
                    { correlationId: msg.properties.correlationId }
                );
                // Acknowledge message
                channel.ack(msg);
            }
        });

        // User Posts ------------------------------------------------------------------------------ ||
        channel.consume(userQueue, async (msg) => {
            if (msg !== null) {
                const { userId } = JSON.parse(msg.content.toString());
                let response;
                try {
                    const records = await postsTable.findAll({ where: { userId: userId } });
                    let data = records.map(record => record.toJSON());

                    // data = Array.isArray(data) ? data : [data];

                    response = { status: 200, data }
                } catch (error) {
                    response = { status: 500, message: error.message };
                    channel.nack(msg, false, false); // Reject message
                    return;
                }
                // Send response back to the reply-to queue
                channel.sendToQueue(
                    msg.properties.replyTo,
                    Buffer.from(JSON.stringify(response)),
                    { correlationId: msg.properties.correlationId }
                );
                // Acknowledge message
                channel.ack(msg);
            }
        });

        // Send Email ------------------------------------------------------------------------------ ||
        channel.consume(emailQueue, async (msg) => {
            if (msg !== null) {
                sgMail.setApiKey(`${key}`)
                const messageContent = msg.content.toString();                
                let response;
                let booking;
                try {
                    booking = JSON.parse(messageContent);
                    const msg1 = {
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
                        sgMail.send(msg1),
                        sgMail.send(reciept)
                    ]);
                    console.log('Emails sent successfully');
                    response = { status: 200, message: 'Emails sent' };
                } catch (error) {
                    response = { status: 500, message: error.message };
                    channel.nack(msg, false, false); // Reject message
                    return;
                }
                // Send response back to the reply-to queue
                channel.sendToQueue(
                    msg.properties.replyTo,
                    Buffer.from(JSON.stringify(response)),
                    { correlationId: msg.properties.correlationId }
                );
                // Acknowledge message
                channel.ack(msg);
            }
        });

        // Create Post ------------------------------------------------------------------------------ ||
        channel.consume(postsQueue, async (msg) => {
            if (msg !== null) {
                const email = msg.content.toString();                
                let response;
                let postData;
                try {
                    postData = JSON.parse(email);
                    console.log(postData);
                    const mood = postData.mood;
                    const image64 = postData.image64;
                    const id = postData.id;
                    const timestamp = Date.now();
                    // const { mood, image64, timestamp, id } = data;     
                    const record = await postsTable.create({
                      mood: mood,
                      image64: image64,
                      userId: id,
                      timestamp: timestamp
                    });
                    // If successful, respond with the inserted record
            
                    response = { status: 201, message: 'Record Created' };
                } catch (error) {
                    response = { status: 500, message: 'Error inserting record' };
                    channel.nack(msg, false, false); // Reject message
                    return;
                }
                // Send response back to the reply-to queue
                channel.sendToQueue(
                    msg.properties.replyTo,
                    Buffer.from(JSON.stringify(response)),
                    { correlationId: msg.properties.correlationId }
                );
                // Acknowledge message
                channel.ack(msg);
            }
        });

        // Delete Post ------------------------------------------------------------------------------ ||
        channel.consume(deleteQueue, async (msg) => {
            if (msg !== null) {
                const data = msg.content.toString();
                console.log(data);
                let response;
                try {
                    const { postId } = JSON.parse(data);

                    // Find the record with the specified _id and delete it
                    const record = await postsTable.findOne({ where: { _id: postId} });
                    if (!record) {
                      response = { status:404,  error: 'Record not found' };
                    }
                
                    await record.destroy();
                
                    // Respond with a success message
                    response = { status: 200, message: 'Record Deleted' };
                } catch (error) {
                    response = { status: 500, message: 'Error deleting record' };
                    channel.nack(msg, false, false); // Reject message
                    return;
                }
                // Send response back to the reply-to queue
                channel.sendToQueue(
                    msg.properties.replyTo,
                    Buffer.from(JSON.stringify(response)),
                    { correlationId: msg.properties.correlationId }
                );
                // Acknowledge message
                channel.ack(msg);
            }
        });

        // Get All Posts ---------------------------------------------------------------------------- ||
        channel.consume(allPostsQueue, async (msg) => {
            if (msg !== null) {
                let response;
                try {
                    // Retrieve all records from the database
                    const records = await postsTable.findAll();
                
                    // Store the retrieved records in a variable
                    const data = records.map(record => record.toJSON());
                
                    response = { status: 200, data };
                } catch (error) {
                    response = { status: 500, message: 'Error retrieving records' };
                    channel.nack(msg, false, false); // Reject message
                    return;
                }
                // Send response back to the reply-to queue
                channel.sendToQueue(
                    msg.properties.replyTo,
                    Buffer.from(JSON.stringify(response)),
                    { correlationId: msg.properties.correlationId }
                );
                // Acknowledge message
                channel.ack(msg);
            }
        });

        // Worker Error Handling and Logging ----------------------------------------------------- ||
        console.log('Worker is running...');
    } catch (error) {
        console.error('Error in RabbitMQ consumer:', error);
    }
};
// Start the worker -----------------------------------------------------------------
consumeMessages();