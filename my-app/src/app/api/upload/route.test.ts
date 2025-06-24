import { createMocks } from 'node-mocks-http';
import { MediaType } from '@/types/media';
import { Blob } from 'buffer';

// Polyfill FormData and File for the Node.js environment
if (!global.FormData) {
  // @ts-ignore
  global.FormData = class FormData {
    private parts: [string, any][] = [];
    append(key: string, value: any) {
      this.parts.push([key, value]);
    }
    get(key: string) {
      const part = this.parts.find(p => p[0] === key);
      return part ? part[1] : null;
    }
  };
}

if (!global.File) {
  // @ts-ignore
  global.File = class File extends Blob {
    name: string;
    lastModified: number;
    constructor(bits: any[], name: string, options?: FilePropertyBag) {
      super(bits, options);
      this.name = name;
      this.lastModified = options?.lastModified ?? Date.now();
    }
  };
}

// Mock the dependencies at the top level
jest.mock('@/lib/s3');
jest.mock('@/lib/prisma');

describe('/api/upload', () => {
  let POST: any;
  let mockedS3Helpers: any;
  let mockedPrisma: any;

  beforeEach(() => {
    jest.resetModules();

    // Dynamically require modules after resetting
    const route = require('./route');
    mockedS3Helpers = require('@/lib/s3');
    mockedPrisma = require('@/lib/prisma').prisma;
    POST = route.POST;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should upload a file and return media data on success', async () => {
    // Arrange
    const mockFile = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
    const mockVehicleId = 'cl-12345';
    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('vehicleId', mockVehicleId);

    const mockS3Result = {
      url: 'https://s3.amazonaws.com/bucket/test.jpg',
      key: 'test.jpg',
    };
    mockedS3Helpers.uploadBufferToS3.mockResolvedValue(mockS3Result);

    const mockMediaResult = {
      id: 'media-123',
      url: mockS3Result.url,
      s3Key: mockS3Result.key,
      type: MediaType.IMAGE,
      vehicleId: mockVehicleId,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    (mockedPrisma.media.create as jest.Mock).mockResolvedValue(mockMediaResult);

    const { req } = createMocks({
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data; boundary=---123',
      },
    });

    (req as any).formData = jest.fn().mockResolvedValue(formData);

    // Act
    const response = await POST(req as any);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(JSON.parse(JSON.stringify(data))).toEqual(JSON.parse(JSON.stringify(mockMediaResult)));
    expect(mockedS3Helpers.uploadBufferToS3).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.media.create).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.media.create).toHaveBeenCalledWith({
      data: {
        url: mockS3Result.url,
        s3Key: mockS3Result.key,
        type: MediaType.IMAGE,
        vehicle: { connect: { id: mockVehicleId } },
      },
    });
  });

  it('should return a 500 error if S3 upload fails', async () => {
    // Arrange
    const mockFile = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', mockFile);

    const s3Error = new Error('S3 is having a bad day');
    mockedS3Helpers.uploadBufferToS3.mockRejectedValue(s3Error);

    const { req } = createMocks({
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data; boundary=---123',
      },
    });

    (req as any).formData = jest.fn().mockResolvedValue(formData);

    // Act
    const response = await POST(req as any);

    // Assert
    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Internal Server Error');
    expect(mockedS3Helpers.uploadBufferToS3).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.media.create).not.toHaveBeenCalled();
  });

  it('should return a 400 error if the file is missing from the form data', async () => {
    // Arrange
    const formData = new FormData(); // No file appended

    const { req } = createMocks({
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data; boundary=---123',
      },
    });

    (req as any).formData = jest.fn().mockResolvedValue(formData);

    // Act
    const response = await POST(req as any);

    // Assert
    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Bad Request: 'file' field missing");
    expect(mockedS3Helpers.uploadBufferToS3).not.toHaveBeenCalled();
    expect(mockedPrisma.media.create).not.toHaveBeenCalled();
  });
});
