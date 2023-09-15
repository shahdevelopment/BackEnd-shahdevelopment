const AWS = require('aws-sdk');
const fs = require('fs');

const newFile = 'kube_pv/drawings.db'
const kubedevops = 'kubedevops001'

class S3Adapter {
    constructor(options) {
        this.options = options;
        this.s3 = new AWS.S3();
    }

    setStorageFile(callback) {
        const params = {
            Bucket: kubedevops,
            Key: newFile,
            Body: fs.readFileSync(newFile)
        };
        console.log(newFile)
        this.s3.upload(params, (err, data) => {
            if (err) return callback(err);
            return callback(null, data);
        });
    }
    // Implement other storage functions (e.g., createNewFile, ensureDirectoryExists, etc.)
}
module.exports = S3Adapter;