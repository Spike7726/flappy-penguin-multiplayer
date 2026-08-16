import { io, Socket } from "socket.io-client";

export const socket: Socket = io("http://localhost:3000");

interface JoinResult {
  success: boolean;
  reason?: string;
}

export interface GameInfo {
  SERVER_SEED: number;
  SERVER_START_TIME: number;
}

let gameInfoPromise: Promise<GameInfo> | null = null;

socket.on("connect", () => {
  console.log("Connected to server:", socket.id);
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
  gameInfoPromise = null;
});

export function getGameInfo(): Promise<GameInfo> {
  if (!gameInfoPromise) {
    gameInfoPromise = new Promise((resolve) => {
      socket.once("game-info", (info: GameInfo) => {
        resolve(info);
      });
    });
  }
  return gameInfoPromise;
}

export function joinGame(name: string): Promise<JoinResult> {
  return new Promise((resolve) => {
    socket.emit("join", name, resolve);
  });
}

export function leaveGame(): void {
  socket.emit("leave");
}

export function playerUpdate(y: number, score: number): void {
  socket.emit("player-update", { y, score });
}