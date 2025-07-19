import { v4 as uuidv4 } from 'uuid';

// Import the module we're testing
import * as s3Module from '../s3';

// Mock the uuid and S3 client libraries
jest.mock('uuid');

// Create mock implementations
const mockSend = jest.fn();
const mockPutObjectCommand = jest.fn((input) => ({
  input,
  constructor: { name: 'PutObjectCommand' }
}));

const mockDeleteObjectCommand = jest.fn((input) => ({
  input,
  constructor: { name: 'DeleteObjectCommand' }
}));

// Mock the AWS SDK
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: mockSend
  })),
  PutObjectCommand: mockPutObjectCommand,
  DeleteObjectCommand: mockDeleteObjectCommand
}));

describe('S3 Helper Functions', () => {
  const OLD_ENV = process.env;
  const BUCKET = 'test-bucket';
  const REGION = 'us-east-2';
  let mockUuidV4: jest.Mock;

  beforeEach(() => {
    jest.resetModules();

    process.env = {
      ...OLD_ENV,
      VEHICLE_MEDIA_BUCKET: BUCKET,
      AWS_REGION: REGION,
      AWS_ACCESS_KEY_ID: 'test-key-id',
      AWS_SECRET_ACCESS_KEY: 'test-secret-key',
    };

    // Setup mocks
    mockUuidV4 = uuidv4 as jest.Mock;
    mockSend.mockClear();
    mockPutObjectCommand.mockClear();
    mockDeleteObjectCommand.mockClear();
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.clearAllMocks();
  });

  it('uploadBufferToS3 should upload a buffer and return the public URL and key', async () => {
    // Arrange
    const mockKey = 'mock-uuid-1234';
    mockUuidV4.mockReturnValue(mockKey);
    mockSend.mockResolvedValue({});

    const buffer = Buffer.from('test data');
    const mimeType = 'text/plain';
    
    // Act
    const result = await s3Module.uploadBufferToS3({ buffer, mimeType });

    // Assert
    const expectedKey = `uploads/${mockKey}`;
    const expectedUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${expectedKey}`;

    expect(result.url).toBe(expectedUrl);
    expect(result.key).toBe(expectedKey);

    // Verify S3 client was called with correct parameters
    expect(mockSend).toHaveBeenCalledTimes(1);
    const sentCommand = mockSend.mock.calls[0][0];
    
    expect(sentCommand.constructor.name).toBe('PutObjectCommand');
    expect(sentCommand.input).toEqual({
      Bucket: BUCKET,
      Key: expectedKey,
      Body: buffer,
      ContentType: mimeType,
    });
  });

  it('deleteObjectFromS3 should send a DeleteObjectCommand with the correct key', async () => {
    // Arrange
    mockSend.mockResolvedValue({});
    const key = 'test-uploads/mock-uuid-1234';
    
    // Act
    await s3Module.deleteObjectFromS3(key);

    // Assert
    expect(mockSend).toHaveBeenCalledTimes(1);
    const sentCommand = mockSend.mock.calls[0][0];
    
    expect(sentCommand.constructor.name).toBe('DeleteObjectCommand');
    expect(sentCommand.input).toEqual({
      Bucket: BUCKET,
      Key: key,
    });
  });

  it('deleteObjectFromS3 should throw an error if the key is empty', async () => {
    // Act & Assert
    await expect(s3Module.deleteObjectFromS3('')).rejects.toThrow(
      'S3 object key cannot be empty.'
    );
    expect(mockSend).not.toHaveBeenCalled();
  });
});
