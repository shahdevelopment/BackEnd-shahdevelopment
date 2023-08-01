// add.test.js

function add(a, b) {
    return a + b;
}

test('addition works correctly', () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-1, 5)).toBe(4);
});
