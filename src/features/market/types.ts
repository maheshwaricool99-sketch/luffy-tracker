export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected" | "error";

export type KlinePoint = {
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
};
