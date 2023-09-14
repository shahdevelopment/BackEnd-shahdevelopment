const express = require('express');
const Datastore = require('nedb');
const AWS = require('aws-sdk');
const fs = require('fs');

const dbPath = 's3://kubedevops001/kube_pv/drawings.db';
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

const database = new Datastore({ filename: dbPath, autoload: true });
database.loadDatabase();

// #######################################################################
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

function getTime() {
    var getIndexTime = new Date().valueOf();
    return getIndexTime; // returns the value of getIndexTime
}

app.post('/api', (req, res) => {
    // var data = {};
    // data = req.body;
    // var time = new Date(getTime()); // making sure changes are made
    // var callActiveHours = time.getHours();
    // var callActiveMinutes = time.getMinutes();
    // var callActiveSeconds = time.getSeconds();
    // data.timestamp = callActiveHours.toString().padStart(2, '0') + ":" + callActiveMinutes.toString().padStart(2, '0') + ":" + callActiveSeconds.toString().padStart(2, '0'); // add leading zeros    
    // database.insert(data);
    // res.json(data);
    const data = req.body;
    const timestamp = Date.now();
    data.timestamp = timestamp;
    const params = {
        Bucket: 'kubedevops001',
        Key: 'drawings.db',
        UploadId: 'c573c445-f28c-4a67-b646-9b031d15a8da', // Retrieve this from the initial upload
        Body: fs.createReadStream(database.insert(data)), // Specify the file you want to append
        PartNumber: 1, // This is the part number of the append operation
    };
    // Initiate the multipart upload append
    s3.uploadPart(params, (err, data) => {
        if (err) {
            console.error(err);
        } else {
            console.log('DB Insert successful:', data);
        }
    });
    res.json(data);
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
