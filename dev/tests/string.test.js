// string.test.js

function getStringLength(str) {
    return str.length;
}

test('string length is calculated correctly', () => {
    expect(getStringLength('Hello')).toBe(5);
    expect(getStringLength('')).toBe(0);
});
