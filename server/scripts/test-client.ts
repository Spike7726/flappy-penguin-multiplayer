import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Connected to server, id:", socket.id);
  socket.emit("ping");
});

socket.on("pong", () => {
  console.log("Received pong back from server — round trip works!");
  socket.disconnect();
  process.exit(0);
});

socket.on("connect_error", (err) => {
  console.error("Connection failed:", err.message);
  process.exit(1);
});