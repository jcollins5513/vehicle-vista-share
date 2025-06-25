import { createMocks } from 'node-mocks-http';

// Mocks are at the top level
jest.mock('@/lib/s3');
jest.mock('@/lib/prisma');

describe('/api/media/[id]', () => {
  let DELETE: unknown;
  let mockedS3Helpers: typeof import('@/lib/s3');
  let mockedPrisma: typeof import('@/lib/prisma').prisma;

  beforeEach(async () => {
    jest.resetModules();
    // Dynamically import route and mocks after resetting modules
    const routeModule = await import('./route');
    const s3Module = await import('@/lib/s3');
    const prismaModule = await import('@/lib/prisma');
    const route = routeModule as typeof import('./route');
    mockedS3Helpers = s3Module as typeof import('@/lib/s3');
    mockedPrisma = (prismaModule as { prisma: typeof import('@/lib/prisma').prisma }).prisma;
    DELETE = route.DELETE;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully delete media and return 200 OK', async () => {
    // Arrange
    const mediaId = 'test-media-id';
    const s3Key = 'test-s3-key';

    const mockMedia = {
      id: mediaId,
      s3Key: s3Key,
    };

    (mockedPrisma.media.findUnique as jest.Mock).mockResolvedValue(mockMedia);
    (mockedS3Helpers.deleteObjectFromS3 as jest.Mock).mockResolvedValue({});
    (mockedPrisma.media.delete as jest.Mock).mockResolvedValue({});

    const { req } = createMocks({
      method: 'DELETE',
    });

    // Act
    const response = await DELETE(req as unknown, { params: { id: mediaId } });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockedPrisma.media.findUnique).toHaveBeenCalledWith({ where: { id: mediaId } });
    expect(mockedS3Helpers.deleteObjectFromS3).toHaveBeenCalledWith(s3Key);
    expect(mockedPrisma.media.delete).toHaveBeenCalledWith({ where: { id: mediaId } });
  });

  it('should return 404 if the media ID does not exist', async () => {
    // Arrange
    const mediaId = 'non-existent-id';
    (mockedPrisma.media.findUnique as jest.Mock).mockResolvedValue(null);

    const { req } = createMocks({
      method: 'DELETE',
    });

    // Act
    const response = await DELETE(req as unknown, { params: { id: mediaId } });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Media not found' });
    expect(mockedS3Helpers.deleteObjectFromS3).not.toHaveBeenCalled();
    expect(mockedPrisma.media.delete).not.toHaveBeenCalled();
  });

  it('should return 500 if S3 deletion fails', async () => {
    // Arrange
    const mediaId = 'test-media-id';
    const s3Key = 'test-s3-key';
    const mockMedia = { id: mediaId, s3Key: s3Key };

    (mockedPrisma.media.findUnique as jest.Mock).mockResolvedValue(mockMedia);
    const s3Error = new Error('S3 deletion failed');
    (mockedS3Helpers.deleteObjectFromS3 as jest.Mock).mockRejectedValue(s3Error);

    const { req } = createMocks({
      method: 'DELETE',
    });

    // Act
    const response = await DELETE(req as unknown, { params: { id: mediaId } });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal Server Error' });
    expect(mockedS3Helpers.deleteObjectFromS3).toHaveBeenCalledWith(s3Key);
    expect(mockedPrisma.media.delete).not.toHaveBeenCalled(); // IMPORTANT: Ensure we don't delete the DB record if S3 fails
  });
});
