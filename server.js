const express = require('express');
const Datastore = require('nedb');
const S3Adapter = require('./s3Adapter');

const app = express()
const PORT = 9000
const HOST = '0.0.0.0';

const db = new Datastore({
    filename: 's3://kubedevops001/kube_pv/drawings.db',
    autoload: true,
    storage: new S3Adapter({
        bucket: 'kubedevops001'
    }),
});

// Set the MIME type for JavaScript files
app.set('view engine', 'js');
app.engine('js', (_, options, callback) => {
    callback(null, options.source);
});

// require('dotenv').config();
// app.use(express.static('public', {
//     setHeaders: (response, path, stat) => {
//         if (path.endsWith('js')) {
//             response.setHeader('Content-Type', 'application/javascript');
//         }
//     }
// }));

app.use(express.json({ limit: '1mb' }));

app.listen(PORT, HOST, () => {
    console.log(`Server has started on http://${HOST}:${PORT}`)
})

// #######################################################################
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
