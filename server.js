const express = require('express');
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

app.get('/api', (req, res) => {
    database.find({}, (err, data) => {
        if (err) {
            res.end();
            return;
        }
        res.json(data);
    });
});

app.post('/api', (request, response) => {
    var data = request.body;
    (time = Date.now());
    console.log(time)
    data.timestamp = time;
    database.insert(data);
    response.json(data);
});

app.delete('/api/:id', (req, res) => {
    const postId = req.params.id;
    console.log(postId);
    database.remove({ _id: postId }, {}, (err, numRemoved) => {
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
