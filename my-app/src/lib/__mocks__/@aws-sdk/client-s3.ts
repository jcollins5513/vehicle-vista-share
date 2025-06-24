const originalModule = jest.requireActual('@aws-sdk/client-s3');

// This is the mock function our tests will use
export const mockSend = jest.fn();

// We export a mock version of S3Client
export const S3Client = jest.fn(() => ({
  send: mockSend,
}));

// We re-export the original command classes so our code can still use them
export const PutObjectCommand = originalModule.PutObjectCommand;
export const DeleteObjectCommand = originalModule.DeleteObjectCommand;
