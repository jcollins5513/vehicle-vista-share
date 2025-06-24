// Define types for the module we are testing
type S3Module = {
  uploadBufferToS3: (opts: {
    buffer: Buffer;
    mimeType: string;
    keyPrefix?: string;
  }) => Promise<{ url: string; key: string }>;
  deleteObjectFromS3: (key: string) => Promise<void>;
};

// Mock the uuid and S3 client libraries
jest.mock("uuid");
jest.mock("@aws-sdk/client-s3");

describe("S3 Helper Functions", () => {
  let s3Module: S3Module;
  let mockSend: jest.Mock;
  let uuidv4: jest.Mock;
  let PutObjectCommand: any;
  let DeleteObjectCommand: any;

  const OLD_ENV = process.env;
  const BUCKET = "test-bucket";
  const REGION = "us-east-2";

  beforeEach(() => {
    jest.resetModules();

    process.env = {
      ...OLD_ENV,
      VEHICLE_MEDIA_BUCKET: BUCKET,
      AWS_REGION: REGION,
      AWS_ACCESS_KEY_ID: "test-key-id",
      AWS_SECRET_ACCESS_KEY: "test-secret-key",
    };

    // Re-acquire handles to mocks, command classes, and the module under test AFTER resetting
    const s3ClientMock = require("@aws-sdk/client-s3");
    const uuidMock = require("uuid");
    s3Module = require("../s3");

    mockSend = s3ClientMock.mockSend;
    uuidv4 = uuidMock.v4;
    PutObjectCommand = s3ClientMock.PutObjectCommand;
    DeleteObjectCommand = s3ClientMock.DeleteObjectCommand;

    mockSend.mockClear();
    uuidv4.mockClear();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("uploadBufferToS3 should upload a buffer and return the public URL and key", async () => {
    uuidv4.mockReturnValue("mock-uuid-1234");
    mockSend.mockResolvedValue({});

    const buffer = Buffer.from("test data");
    const result = await s3Module.uploadBufferToS3({ buffer, mimeType: "text/plain" });

    const expectedKey = `uploads/mock-uuid-1234`;
    const expectedUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${expectedKey}`;

    expect(result.url).toBe(expectedUrl);
    expect(result.key).toBe(expectedKey);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const sentCommand = mockSend.mock.calls[0][0];
    expect(sentCommand).toBeInstanceOf(PutObjectCommand);
    expect(sentCommand.input.Key).toBe(expectedKey);
  });

  it("deleteObjectFromS3 should send a DeleteObjectCommand with the correct key", async () => {
    mockSend.mockResolvedValue({});
    const key = "test-uploads/mock-uuid-1234";
    await s3Module.deleteObjectFromS3(key);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const sentCommand = mockSend.mock.calls[0][0];
    expect(sentCommand).toBeInstanceOf(DeleteObjectCommand);
    expect(sentCommand.input).toEqual({
      Bucket: BUCKET,
      Key: key,
    });
  });

  it("deleteObjectFromS3 should throw an error if the key is empty", async () => {
    await expect(s3Module.deleteObjectFromS3("")).rejects.toThrow(
      "S3 object key cannot be empty."
    );
    expect(mockSend).not.toHaveBeenCalled();
  });
});
