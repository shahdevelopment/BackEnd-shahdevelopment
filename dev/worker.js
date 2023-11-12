const Stomp = require('stompjs');


const postgres_db = process.env.POSTGRES_DB;
const postgres_user = process.env.POSTGRES_USER;
const postgres_pass = process.env.POSTGRES_PASSWORD;


const client = Stomp.client('wss://k8-backend.shahdevelopment.tech/rabbit:15674/ws');

async function connectToPostgres() {
    const { Client } = require('pg');
    const pgClient = new Client({
        user: postgres_user,
        host: 'https://k8-backend.shahdevelopment.tech/pg',
        database: postgres_db,
        password: postgres_pass,
        port: 5432,
    });

    await pgClient.connect();
    return pgClient;
}

client.connect('guest', 'guest', (frame) => {
    console.log('Connected to RabbitMQ');

    const queueName = '/exchange/amq.topic/sql_queries';
    client.subscribe(queueName, (message) => {
        try {
            const data = JSON.parse(message.body);
            const { mood, image64, timestamp } = data;

            // Connect to PostgreSQL
            connectToPostgres().then(async (pgClient) => {
                // Insert data into PostgreSQL
                const query = 'INSERT INTO your_table (mood, image64, timestamp) VALUES ($1, $2, $3)';
                const values = [mood, image64, new Date(timestamp)];

                await pgClient.query(query, values);

                // Release the client
                await pgClient.end();

                console.log('Data inserted into PostgreSQL:', data);
            }).catch(error => console.error('Error connecting to PostgreSQL:', error));
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });
});
