jest.mock('@/lib/services/redisService');

describe('/api/inventory', () => {
  let GET: typeof import('./route').GET;
  let mockedService: jest.Mocked<typeof import('@/lib/services/redisService')>;

  beforeEach(async () => {
    jest.resetModules();
    const routeModule = await import('./route');
    const serviceModule = await import('@/lib/services/redisService');
    GET = (routeModule as { GET: typeof GET }).GET;
    mockedService = serviceModule as jest.Mocked<typeof serviceModule>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns inventory data from redis', async () => {
    const mockData = { vehicles: [{ id: '1' }], lastUpdated: 'now' };
    mockedService.redisService.getInventoryData.mockResolvedValue(mockData as any);
    const response = await GET();
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toEqual(mockData);
    expect(mockedService.redisService.getInventoryData).toHaveBeenCalledTimes(1);
  });

  it('returns 500 on error', async () => {
    mockedService.redisService.getInventoryData.mockRejectedValue(new Error('fail'));
    const response = await GET();
    expect(response.status).toBe(500);
  });
});
