const AWS = require('aws-sdk');
const fs = require('fs');

AWS.config.update({ region: 'us-west-1' });

class S3Adapter {
    constructor(options) {
        this.options = options;
        this.s3 = new AWS.S3();
    }

    setStorageFile(newFilename, callback) {
        const params = {
            Bucket: this.options.bucket,
            Key: newFilename,
            Body: fs.readFileSync(newFilename)
        };
        console.log(newFilename)
        this.s3.upload(params, (err, data) => {
            if (err) return callback(err);
            return callback(null, data);
        });
    }
    // Implement other storage functions (e.g., createNewFile, ensureDirectoryExists, etc.)
}
module.exports = S3Adapter;