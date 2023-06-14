const express = require('express')

const cors = require('cors');
const app = express()

const port = 9000

app.use(cors());

const corsOptions = {
        origin: 'https://shahdevelopment.tech'
};

app.use(cors(corsOptions));

app.get('/chat', (req, res) => {
    res.status(200).json({ info: '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' })
})

app.get('/blocked', (req, res) => {
    const modifiedHTML = `
        <html>
        <head>
        <title>404 - Are you sure you want to go there?</title>
        </head>
        <body>
        <h1>Are you sure you want to go there?</h1>
        <p>You're here because we think that is a really bad idea.</p>
        <hr>
        <p>Varnish cache server</p>
        </body>
        </html>
    `;
    res.send(modifiedHTML);
})

app.listen(port, () => console.log(`Server has started on port ${port}`))
