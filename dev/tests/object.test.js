// object.test.js

const person = {
    name: 'John',
    age: 30,
};

test('person object has the correct properties', () => {
    expect(person).toHaveProperty('name', 'John');
    expect(person).toHaveProperty('age', 30);
    expect(person).not.toHaveProperty('city');
});
