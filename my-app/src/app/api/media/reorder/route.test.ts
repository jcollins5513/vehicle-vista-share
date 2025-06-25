

jest.mock('@/lib/prisma');

describe('/api/media/reorder', () => {
  let PATCH: unknown;
  let mockedPrisma: unknown;

  beforeEach(async () => {
    jest.resetModules();
    // Dynamically import route and mocks after resetting modules
    const routeModule = await import('./route');
    const prismaModule = await import('@/lib/prisma');
    const route: { PATCH: (req: unknown) => Promise<{ status: number; json: () => Promise<unknown>; }> } = routeModule as unknown;
    mockedPrisma = (prismaModule as { prisma: unknown }).prisma;
    PATCH = route.PATCH;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully reorder media and return 200 OK', async () => {
    // Arrange
    const reorderPayload = [
      { id: 'media-1', order: 2 },
      { id: 'media-2', order: 1 },
    ];

    (mockedPrisma.media.update as jest.Mock).mockResolvedValue({});
    (mockedPrisma.$transaction as jest.Mock).mockResolvedValue({});

    const req = {
      json: async () => reorderPayload,
    };

    // Act
    const response = await PATCH(req as unknown);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
    // Check that the transaction was called with the correct update promises
    const transactionCalls = (mockedPrisma.$transaction as jest.Mock).mock.calls[0][0];
    expect(transactionCalls.length).toBe(2);
  });

  it('should return 400 if the request body is not an array', async () => {
    // Arrange
    const invalidPayload = { id: 'media-1', order: 1 }; // Not an array
    const req = { json: async () => invalidPayload };

    // Act
    const response = await PATCH(req as unknown);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data).toEqual({ error: 'Invalid request body' });
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('should return 500 if the prisma transaction fails', async () => {
    // Arrange
    const reorderPayload = [{ id: 'media-1', order: 1 }];
    const req = { json: async () => reorderPayload };

    const dbError = new Error('DB transaction failed');
    (mockedPrisma.$transaction as jest.Mock).mockRejectedValue(dbError);

    // Act
    const response = await PATCH(req as unknown);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: 'Internal Server Error' });
  });
});
