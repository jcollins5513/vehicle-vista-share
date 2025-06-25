// Minimal test to verify Jest is working
console.log('Minimal test file loaded');

describe('Minimal Test', () => {
  it('should pass a simple test', () => {
    console.log('Running minimal test');
    expect(1 + 1).toBe(2);
  });
});
