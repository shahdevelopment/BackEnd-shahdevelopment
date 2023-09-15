const fs = require('fs');
const axios = require('axios');
// Base URL of your Node.js application running on the container
const baseUrl = 'http://localhost:9000';
// Array of paths to evaluate
const pathsToEvaluate = [
    '/chat',
    '/api',
    '/health',
    '/ready'
];
async function evaluatePaths() {
    try {
        const report = [];
        for (const path of pathsToEvaluate) {
            const url = `${baseUrl}${path}`;
            console.log(`Evaluating path: ${url}`);
            try {
                const response = await axios.get(url);
                if (response.status === 200) {
                    console.log(`Path "${path}" is reachable.`);
                    report.push({ path, status: 'reachable' });
                    // You can add more evaluation logic based on the response content if needed.
                } else {
                    console.log(`Path "${path}" returned status code ${response.status}.`);
                    report.push({ path, status: `status code ${response.status}` });
                }
            } catch (error) {
                console.error(`Error occurred while evaluating path "${path}":`, error.message);
                report.push({ path, status: 'error', error: error.message });
            }
        }
        // Write the report to a file
        // Create a directory called "npm-tests" if it doesn't exist
        const reportDir = 'npm-tests';
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir);
        }
        const reportFilePath = `${reportDir}/report.json`;
        fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2));
        console.log(`Report generated and stored in: ${reportFilePath}`);
    } catch (error) {
        console.error('Error occurred:', error);
    }
}
evaluatePaths();