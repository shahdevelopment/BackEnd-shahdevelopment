function containsElement(arr, element) {
    return arr.includes(element);
}

test('array contains element', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(containsElement(arr, 3)).toBe(true);
    expect(containsElement(arr, 6)).toBe(false);
});