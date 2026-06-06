const assert = require('assert');
const ReservationModel = require('../src/models/ReservationModel');

console.log('Running ReservationModel.validate() unit tests...\n');

// Test 1: End time before start time should fail
console.log('Test 1: Reservation with end time before start time');
const invalidTimes = ReservationModel.validate({
  room_id: 1,
  start_time: new Date(Date.now() + 3600000).toISOString(),
  end_time: new Date(Date.now() - 3600000).toISOString()
});
console.log('  Input: room_id=1, end_time earlier than start_time');
console.log('  Result:', JSON.stringify(invalidTimes));
assert.strictEqual(invalidTimes.valid, false, 'Expected valid to be false');
assert.ok(invalidTimes.errors.includes('End time must be after start time.'),
  'Expected time error message');
console.log('  PASS: End-before-start error returned correctly\n');

// Test 2: Reservation over 4 hours should fail
console.log('Test 2: Reservation exceeding 4-hour maximum');
const tomorrow = new Date(Date.now() + 86400000);
const farFuture = new Date(tomorrow.getTime() + (5 * 3600000));
const tooLong = ReservationModel.validate({
  room_id: 1,
  start_time: tomorrow.toISOString(),
  end_time: farFuture.toISOString()
});
console.log('  Input: room_id=1, duration = 5 hours');
console.log('  Result:', JSON.stringify(tooLong));
assert.strictEqual(tooLong.valid, false, 'Expected valid to be false');
assert.ok(tooLong.errors.includes('Reservations cannot exceed 4 hours.'),
  'Expected duration error message');
console.log('  PASS: 4-hour limit enforced correctly\n');

console.log('All ReservationModel validation tests passed.');
