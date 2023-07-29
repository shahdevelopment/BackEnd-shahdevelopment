const express = require('express')
const app = express()

const PORT = 9000
const HOST = '0.0.0.0';

require('dotenv').config();


app.get('/chat', (req, res) => {
    const apiKey = process.env.api_key_chat;
    res.status(200).json({ info: apiKey })
})

app.listen(PORT, HOST, () => console.log(`Server has started on http://${HOST}:${PORT}`))