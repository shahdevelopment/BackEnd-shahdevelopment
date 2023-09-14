fileNew = kube_pv / drawings.db

class S3Adapter {
    constructor(options) {
        this.options = options;
        this.s3 = new AWS.S3();
    }

    setStorageFile(fileNew, callback) {
        const params = {
            Bucket: kubedevops001,
            Key: fileNew,
            Body: fs.readFileSync(fileNew),
        };

        this.s3.upload(params, (err, data) => {
            if (err) return callback(err);
            return callback(null, data);
        });
    }
    // Implement other storage functions (e.g., createNewFile, ensureDirectoryExists, etc.)
}
module.exports = S3Adapter;