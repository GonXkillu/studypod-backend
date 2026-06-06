const assert = require('assert');
const UserModel = require('../src/models/UserModel');

console.log('Running UserModel.validate() unit tests...\n');

// Test 1: Empty password should fail validation
console.log('Test 1: Login without password');
const emptyPassword = UserModel.validate({
  name: 'John Doe',
  email: 'john@example.com',
  password: ''
});
console.log('  Input: { name: "John Doe", email: "john@example.com", password: "" }');
console.log('  Result:', JSON.stringify(emptyPassword));
assert.strictEqual(emptyPassword.valid, false, 'Expected valid to be false');
assert.ok(emptyPassword.errors.includes('Password must be at least 8 characters.'),
  'Expected password error message');
console.log('  PASS: Password validation error returned correctly\n');

// Test 2: Valid credentials should pass validation
console.log('Test 2: Valid registration data');
const validData = UserModel.validate({
  name: 'Jane Smith',
  email: 'jane@example.com',
  password: 'Hello123'
});
console.log('  Input: { name: "Jane Smith", email: "jane@example.com", password: "Hello123" }');
console.log('  Result:', JSON.stringify(validData));
assert.strictEqual(validData.valid, true, 'Expected valid to be true');
assert.strictEqual(validData.errors.length, 0, 'Expected no errors');
console.log('  PASS: Valid data accepted with no errors\n');

console.log('All UserModel validation tests passed.');
