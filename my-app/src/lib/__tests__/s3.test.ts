// Import the actual types from the AWS SDK
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// Import the module we're testing
import * as s3Module from '../s3';

// Mock the uuid and S3 client libraries
jest.mock('uuid');
jest.mock('@aws-sdk/client-s3');

// Type definitions for our mocks
type MockS3Client = jest.Mocked<S3Client>;
type MockPutObjectCommand = jest.MockedClass<typeof PutObjectCommand>;
type MockDeleteObjectCommand = jest.MockedClass<typeof DeleteObjectCommand>;

describe('S3 Helper Functions', () => {
  let mockSend: jest.Mock;
  let mockUuidV4: jest.Mock;
  let mockPutObjectCommand: MockPutObjectCommand;
  let mockDeleteObjectCommand: MockDeleteObjectCommand;

  const OLD_ENV = process.env;
  const BUCKET = 'test-bucket';
  const REGION = 'us-east-2';

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
    mockSend = jest.fn();
    mockUuidV4 = uuidv4 as jest.Mock;
    
    // Mock the S3 client and commands
    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));
    
    mockPutObjectCommand = PutObjectCommand as MockPutObjectCommand;
    mockDeleteObjectCommand = DeleteObjectCommand as MockDeleteObjectCommand;
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = OLD_ENV;
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
    
    expect(sentCommand).toBeInstanceOf(PutObjectCommand);
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
    
    expect(sentCommand).toBeInstanceOf(DeleteObjectCommand);
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
