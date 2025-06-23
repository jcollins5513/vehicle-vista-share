// Media types for the application
export enum MediaType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO"
}

export interface Media {
  id: string;
  url: string;
  type: MediaType;
  vehicleId: string | null;
  order: number;
  createdAt: Date;
}
