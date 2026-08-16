import { Server } from "socket.io";

const io = new Server(3000, {
  cors: {
    origin: "*",
  },
});

interface PlayerState {
  name: string;
  y: number;
  score: number;
}

const SERVER_SEED = Math.floor(Math.random() * 1_000_000_000);
const SERVER_START_TIME = Date.now(); 

// i am not going to communicate this start value between client/server just to initialise it LOL
const START_POS_Y = 300;

// socket id -> active player data
const activePlayers = new Map<string, PlayerState>();

// for inexpensive existing name querying
const activeNames = new Set<string>();

// handles player being removed from active gameplay
function removePlayer(socketId: string): void {
  const player = activePlayers.get(socketId);

  if (player) {
    activeNames.delete(player.name);
    activePlayers.delete(socketId);
    console.log(`${socketId} ("${player.name}") left`);
  }
}

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.emit("game-info", { SERVER_SEED, SERVER_START_TIME });

  socket.on("join", (rawName: string, callback: (result: {success: boolean, reason?: string}) => void) => {
    // clean up in case of unterminated connection
    if (activePlayers.has(socket.id)) {
      removePlayer(socket.id);
    }

    if (typeof rawName !== "string") {
      callback({ success: false, reason: "Invalid name format" });
      return;
    }

    const name = rawName.trim();

    if (name.length == 0) {
      callback({ success: false, reason: "Please enter a name" });
      return;
    }

		if (activeNames.has(name)) {
			callback({ success: false, reason: "Name already in use" });
      return;
		}

		activeNames.add(name);
		activePlayers.set(socket.id, {
      name: name,
      y: START_POS_Y,
      score: 0
    });
		console.log(`${socket.id} joined as "${name}"`);
    callback({ success: true });
  });

  socket.on("player-update", (data: { y: number; score: number }) => {
    const player = activePlayers.get(socket.id);
    if (player && typeof data.y === "number" && typeof data.score === "number") {
      player.y = data.y;
      player.score = data.score;
    }
  });

	socket.on("leave", () => {
		removePlayer(socket.id);
	});

  socket.on("disconnect", () => {
		removePlayer(socket.id);
    console.log(`Client disconnected: ${socket.id}`);
  });
});

console.log("Socket.io server listening on port 3000");