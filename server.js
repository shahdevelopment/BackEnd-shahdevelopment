const express = require('express');
const { Sequelize } = require('sequelize');
const { DataTypes } = require('sequelize');

const postgres_db = process.env.POSTGRES_DB;
const postgres_user = process.env.POSTGRES_USER;
const postgres_pass = process.env.POSTGRES_PASSWORD;

rab_host = process.env.RABBIT_MQ_HOST


const sequelize = new Sequelize(postgres_db, postgres_user, postgres_pass, {
    host: 'https://k8-backend.shahdevelopment.tech/pg',
    dialect: 'postgres',
});

const amqp = require('amqplib');

// const sequelize = require('./config');

// const Schema = sequelize.define('Schema', {
//   // Define your schema attributes here
//   email: {
//     type: DataTypes.STRING,
//   },
//   password: {
//     type: DataTypes.STRING,
//   },
// });
const Post = sequelize.define('Post', {
    mood: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    image64: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    timestamp: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
});

// Sync the schema with the database
sequelize.sync({ force: false }) // Set to true if you want to force sync (drops and recreates the schema)
    .then(() => {
        console.log('Schema synced with database.');
    })
    .catch((error) => {
        console.error('Error syncing schema:', error);
    });

// Connect to RabbitMQ
const Stomp = require('stompjs');

async function connectToRabbitMQ() {
    const client = Stomp.client('wss://k8-backend.shahdevelopment.tech/rabbit:15674/ws');

    return new Promise((resolve, reject) => {
        client.connect('guest', 'guest', (frame) => {
            console.log('Connected: ' + frame);
            resolve(client);
        }, (error) => {
            console.error('Error connecting to RabbitMQ:', error);
            reject(error);
        });
    });
}
// const Datastore = require('nedb');

const app = express()
const PORT = 9000
const HOST = '0.0.0.0';

// Set the MIME type for JavaScript files
app.set('view engine', 'js');
app.engine('js', (_, options, callback) => {
    callback(null, options.source);
});



app.use(express.json({ limit: '1mb' }));

app.listen(PORT, HOST, () => {
    console.log(`Server has started on http://${HOST}:${PORT}`)
})

// const db = new Datastore('./db/drawings.db');
// db.loadDatabase();

// #######################################################################

// Express route to handle incoming SQL queries
// app.post('/execute-sql', async (req, res) => {
//     const { connection, channel, queueName } = await connectToRabbitMQ();

//     const { sqlQuery } = req.body; // Assuming the SQL query is sent in the request body

//     // Send the SQL query to RabbitMQ
//     channel.sendToQueue(queueName, Buffer.from(sqlQuery));
//     console.log(`Sent SQL query: ${sqlQuery}`);

//     // Close the connection after sending the message
//     setTimeout(() => {
//         connection.close();
//     }, 500);

//     res.send('SQL query sent to RabbitMQ');
// });

// app.post('/api', async (req, res) => {
//     const { mood, image64 } = req.body;

//     try {
//         const post = await Post.create({
//             mood,
//             image64,
//             timestamp: Date.now(),
//         });

//         res.json(post);
//     } catch (error) {
//         console.error('Error creating post:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

app.post('/api', async (req, res) => {
    const { mood, image64 } = req.body;
    const timestamp = Date.now();

    try {
        const client = await connectToRabbitMQ();

        const message = JSON.stringify({ mood, image64, timestamp });

        const queueName = '/exchange/amq.topic/sql_queries';
        client.send(queueName, { 'content-type': 'application/json' }, message);

        console.log(`Sent to RabbitMQ: ${message}`);

        res.json({ message: 'Data sent to RabbitMQ' });
    } catch (error) {
        console.error('Error sending data to RabbitMQ:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/chat', (req, res) => {
    const apiKey = process.env.api_key_chat;
    res.status(200).json({ info: apiKey })
})
app.get('/api', (req, res) => {
    db.find({}, (err, data) => {
        if (err) {
            res.end();
            return;
        }
        res.json(data);
    });
});
app.post('/api', (req, res) => {
    const data = req.body;
    const timestamp = Date.now();
    data.timestamp = timestamp;
    db.insert(data)
    res.json(data);
});
app.delete('/api/:id', (req, res) => {
    const postId = req.params.id;
    console.log(postId);
    db.remove({ _id: postId }, {}, (err, numRemoved) => {
        if (err) {
            console.error(`Error deleting post with ID ${postId}.`, err);
            res.status(500).send(`Error deleting post with ID ${postId}.`);
        } else {
            console.log(`Post with ID ${postId} deleted.`);
            res.sendStatus(200);
        }
    });
});
app.get('/health', (req, res) => {
    const message = "Healthy!";
    res.status(200).json({ info: message })
})
app.get('/ready', (req, res) => {
    const message = "Ready!";
    res.status(200).json({ info: message })
})
