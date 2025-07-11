import { createMocks } from 'node-mocks-http';
import { MediaType } from '@/types/media';
import { Blob } from 'buffer';
import type { BinaryLike } from 'crypto';
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Type definitions for test request/response
type MockResponse = NextResponse & {
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

type RequestHandler = (req: NextRequest) => Promise<MockResponse>;

// Polyfill FormData and File for the Node.js environment
if (!global.FormData) {
  // @ts-expect-error - Polyfilling FormData in Node.js environment
  global.FormData = class FormData {
    private parts: [string, unknown][] = [];
    append(key: string, value: unknown) {
      this.parts.push([key, value]);
    }
    get(key: string) {
      const part = this.parts.find(p => p[0] === key);
      return part ? part[1] : null;
    }
  };
}

if (!global.File) {
  // @ts-expect-error - Polyfilling File constructor in Node.js environment
  global.File = class File extends Blob {
    name: string;
    lastModified: number;
    constructor(bits: (Blob | ArrayBuffer | BinaryLike)[], name: string, options?: FilePropertyBag) {
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
  let POST: RequestHandler;
  let mockedS3Helpers: jest.Mocked<typeof import('@/lib/s3')>;
  let mockedPrisma: jest.Mocked<typeof import('@/lib/prisma').prisma>;

  beforeEach(async () => {
    jest.resetModules();

    // Dynamically import route and mocks after resetting modules
    const routeModule = await import('./route');
    const s3Module = await import('@/lib/s3');
    const prismaModule = await import('@/lib/prisma');
    
    // Type assertions for modules
    const route = routeModule as { POST: RequestHandler };
    mockedS3Helpers = s3Module as jest.Mocked<typeof s3Module>;
    mockedPrisma = (prismaModule as { prisma: typeof prismaModule.prisma }).prisma as jest.Mocked<typeof prismaModule.prisma>;
    
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

    (req as unknown as { formData: () => Promise<FormData> }).formData = jest.fn().mockResolvedValue(formData);

    // Act
    const response = await POST(req as unknown as NextRequest);
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
    (mockedS3Helpers.uploadBufferToS3 as jest.Mock).mockRejectedValue(s3Error);

    const { req } = createMocks({
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data; boundary=---123',
      },
    });

    (req as unknown as { formData: () => Promise<FormData> }).formData = jest.fn().mockResolvedValue(formData);

    // Act
    const response = await POST(req as unknown as NextRequest);

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

    (req as unknown as { formData: () => Promise<FormData> }).formData = jest.fn().mockResolvedValue(formData);

    // Act
    const response = await POST(req as unknown as NextRequest);

    // Assert
    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Bad Request: 'file' field missing");
    expect(mockedS3Helpers.uploadBufferToS3).not.toHaveBeenCalled();
    expect(mockedPrisma.media.create).not.toHaveBeenCalled();
  });
});
