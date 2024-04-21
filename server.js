import express from 'express';
import Datastore from 'nedb';
import fetch from 'node-fetch';
// import cors from 'cors';
import sgMail from '@sendgrid/mail';

const app = express()
const PORT = 9000
const HOST = '0.0.0.0';

// app.use(cors());


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
        body: JSON.stringify(question)
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
app.post('/email', (req, res) => {
    const key = process.env.api_email_key
    sgMail.setApiKey(key)
    const booking = req.body.formDataObject
    console.log(req.body.formDataObject.name)
    const msg = {
        from: 'shahjehan737@gmail.com',
        to: booking.email,
        subject: `Booking for ${booking.mail} on ${booking.date} at ${booking.time}`,
        text: `Your booking has been confirmed and we have noted your message: "${booking.message}"`,
        html: `
            <p>Hello ${booking.name}, your booking request has been sent!</p>
            <p>Date: ${booking.date}</p>
            <p>Time: ${booking.time}</p>
            <p>Contact: shahjehan-solehria@hotmail.com</p>
            <p>Your message: ${booking.message}</p>
        `    
    };
    sgMail
      .send(msg)
      .then(() => {
        console.log('Email sent')
      })
      .catch((error) => {
        console.error(error)
      })
    const reciept = {
        from: 'shahjehan737@gmail.com',
        to: 'shahjehan737@gmail.com',
        subject: `Booking for ${booking.name} on ${booking.date} at ${booking.time}`,
        text: `Booking has been requested by ${booking.name}!Contact Email'
        we have noted your message: ${booking.message}`,
        html: `
            <p>Hello booking has been  ${booking.name},</p>
            <p>This is a test email sent from Node.js using SendGrid.</p>
            <p>Date: ${booking.date}</p>
            <p>Time: ${booking.time}</p>
            <p>Contact: ${booking.email}</p>
            <p>Message: ${booking.message}</p>
        `
    };
    sgMail
    .send(reciept)
    .then(() => {
      console.log('Email sent')
    })
    .catch((error) => {
      console.error(error)
    })
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
