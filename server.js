const express = require('express')
const Datastore = require('nedb');
const app = express()

const PORT = 9000
const HOST = '0.0.0.0';

const database = new Datastore('drawings.db');
database.loadDatabase();

app.listen(PORT, HOST, () => {
    console.log(`Server has started on http://${HOST}:${PORT}`)
})

app.get('/chat', (req, res) => {
    const apiKey = process.env.api_key_chat;
    res.status(200).json({ info: apiKey })
})

app.get('/api', (request, response) => {
    database.find({}, (err, data) => {
        if (err) {
            response.end();
            return;
        }
        response.json(data);
    });
});

app.post('/api', (request, response) => {
    const data = request.body;
    const timestamp = Date.now();
    data.timestamp = timestamp;
    database.insert(data);
    response.json(data);
});

app.delete('/api/:id', (request, response) => {
    const postId = request.params.id;
    console.log(postId);
    database.remove({ _id: postId }, {}, (err, numRemoved) => {
        if (err) {
            console.error(`Error deleting post with ID ${postId}.`, err);
            response.status(500).send(`Error deleting post with ID ${postId}.`);
        } else {
            console.log(`Post with ID ${postId} deleted.`);
            response.sendStatus(200);
        }
    });
});

app.get('/health', (req, res) => {
    const message = "";
    res.status(200).json({ info: apiKey })
})