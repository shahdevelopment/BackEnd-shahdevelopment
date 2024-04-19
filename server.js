const express = require('express');
const Datastore = require('nedb');
const fetch = require('node-fetch');

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

const db = new Datastore('./db/drawings.db');
db.loadDatabase();

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
        body: question
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
