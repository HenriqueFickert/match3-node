const net = require('net');

let game = null;

const server = net.createServer((socket) => {
    console.log("Connection from", socket.remoteAddress, "port", socket.remotePort)

    if (game === null) {
        game = new Game();
        game.playerOne = new Player(game, socket, "PlayerOne");
    } else {
        game.playerTwo = new Player(game, socket, "PlayerTwo");
        game = null;
    }

});

server.maxConnections = 20;
server.listen(3000, () => {
    console.log('Server running on http://localhost:3000/');
});

class Game {
    constructor() {
        this.board = Array(9).fill(null)
    }
}

class Player {
    constructor(game, socket, player) {
        Object.assign(this, { game, socket, player })
        this.send(`WELCOME ${player}`);

        if (player === "PlayerOne") {
            game.currentPlayer = this;
            this.send("Waiting for opponent to connect");
        } else {
            this.opponent = game.playerOne;
            this.opponent.opponent = this;
            this.opponent.send("Your move");
        }

        socket.on("data", (buffer) => {
            const command = buffer.toString("utf-8").trim()

            if (command === "QUIT") {
                socket.destroy()
            }
            else if (/^MOVE \d+$/.test(command)) {
                const location = Number(command.substring(5))
                try {
                    game.move(location, this)
                    this.send("VALID_MOVE")
                    this.opponent.send(`OPPONENT_MOVED ${location}`)
                    if (this.game.hasWinner()) {
                        this.send("VICTORY")
                        this.opponent.send("DEFEAT")
                    } else if (this.game.boardFilledUp()) {
                        ;[this, this.opponent].forEach((p) => p.send("TIE"))
                    }
                } catch (e) {
                    this.send(`MESSAGE ${e.message}`)
                }
            }
        })

        socket.on("close", () => {
            try {
                this.opponent.send("OTHER_PLAYER_LEFT")
            } catch (e) { }
        })
    }

    send(message) {
        this.socket.write(`${message}\n`)
    }
}