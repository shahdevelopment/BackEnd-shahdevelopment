// asyncFunction.test.js

function fetchData() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve('Data retrieved successfully');
        }, 1000);
    });
}

test('fetchData returns the correct data', async () => {
    const data = await fetchData();
    expect(data).toBe('Data retrieved successfully');
});