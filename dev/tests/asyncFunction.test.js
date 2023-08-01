// asyncFunction.test.js

function fetch() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ name: 'Sheefamn', status: 'train' });
        }, 1000);
    });
}

test('fetchData returns the correct data', async () => {
    const res = await fetch('http://0.0.0.0:9000/db-test');
    const data = await res.json();
    console.log(data);
    expect(data).toBe({ name: 'Sheefamn', status: 'train' });
});