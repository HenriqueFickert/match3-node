const net = require('net');

let game = null;

const server = net.createServer((socket) => {
    console.log("Connection from", socket.remoteAddress, "port", socket.remotePort);

    if (game === null) {
        game = new Game();
        game.playerOne = new Player(game, socket, "One");
    } else {
        game.playerTwo = new Player(game, socket, "Two");
        game.startGame();
        game = null;
    }
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000/');
});

class Game {
    constructor() {
        this.board = [];
        this.generateBoard();
    }

    generateBoard() {
        for (let i = 0; i < 4; i++) {
            let row = [];
            for (let j = 0; j < 4; j++) {
                row.push(Math.floor(Math.random() * 3) + 1);
            }
            this.board.push(row);
        }
    }

    startGame() {
        this.currentPlayer = this.playerOne;
        this.playerOne.opponent = this.playerTwo;
        this.playerTwo.opponent = this.playerOne;

        this.playerOne.send("A player entered the room.")
        this.playerOne.send("Your move.");
        this.playerTwo.send("Waiting for opponent's move.");
    }

    move(location, destination, player) {
        if (player !== this.currentPlayer) {
            throw new Error("Not your turn.");
        }

        if (!this.isValidCoordinate(location) || !this.isValidCoordinate(destination)) {
            throw new Error("Invalid coordinate.");
        }

        this.swap(location, destination);

        let matches = this.checkForMatch();
        if (matches.length > 0) {

            while (matches.length > 0) {
                matches.forEach(coord => {
                    this.board[coord.x][coord.y] = null;
                });

                this.fillBoard();

                this.currentPlayer.send(JSON.stringify(this.board));
                this.currentPlayer.opponent.send(JSON.stringify(this.board));

                this.currentPlayer.points += matches.length;
                matches = this.checkForMatch();
            }

            // this.currentPlayer.points += matches.length;

            this.currentPlayer.send(`Your points: ${this.currentPlayer.points}`);
            this.currentPlayer.send(`Other player points: ${this.currentPlayer.opponent.points}`);

            this.currentPlayer.opponent.send(`Your points: ${this.currentPlayer.opponent.points}`);
            this.currentPlayer.opponent.send(`Other player points: ${this.currentPlayer.points}`);

            // matches.forEach(coord => {
            //     this.board[coord.x][coord.y] = null;
            // });

            // this.fillBoard();
        }

        this.currentPlayer = this.currentPlayer.opponent;
        this.currentPlayer.send("Your move.");
        this.currentPlayer.opponent.send("Waiting for opponent's move.");
    }

    isValidCoordinate(coord) {
        return coord.x >= 0 && coord.x < this.board.length &&
            coord.y >= 0 && coord.y < this.board[0].length;
    }

    swap(location, destination) {
        const temp = this.board[location.x][location.y];
        this.board[location.x][location.y] = this.board[destination.x][destination.y];
        this.board[destination.x][destination.y] = temp;
    }

    fillBoard() {
        for (let j = 0; j < this.board[0].length; j++) {
            for (let i = this.board.length - 1; i >= 0; i--) {
                if (this.board[i][j] === null) {
                    for (let k = i - 1; k >= 0; k--) {
                        if (this.board[k][j] !== null) {
                            this.board[i][j] = this.board[k][j];
                            this.board[k][j] = null;
                            break;
                        }
                    }
                    if (this.board[i][j] === null) {
                        this.board[i][j] = Math.floor(Math.random() * 3) + 1;
                    }
                }
            }
        }
    }

    checkForMatch() {
        let matches = [];
        for (let i = 0; i < this.board.length; i++) {
            let count = 1;
            for (let j = 0; j < this.board[i].length - 1; j++) {
                if (this.board[i][j] === this.board[i][j + 1]) {
                    count++;
                    if (j === this.board[i].length - 2 && count >= 3) {
                        for (let k = 0; k < count; k++) {
                            matches.push({ x: i, y: j - k });
                        }
                    }
                } else {
                    if (count >= 3) {
                        for (let k = 0; k < count; k++) {
                            matches.push({ x: i, y: j - k });
                        }
                    }
                    count = 1;
                }
            }
        }

        for (let j = 0; j < this.board[0].length; j++) {
            let count = 1;
            for (let i = 0; i < this.board.length - 1; i++) {
                if (this.board[i][j] === this.board[i + 1][j]) {
                    count++;
                    if (i === this.board.length - 2 && count >= 3) {
                        for (let k = 0; k < count; k++) {
                            matches.push({ x: i - k, y: j });
                        }
                    }
                } else {
                    if (count >= 3) {
                        for (let k = 0; k < count; k++) {
                            matches.push({ x: i - k, y: j });
                        }
                    }
                    count = 1;
                }
            }
        }

        return matches;
    }
}

class Player {
    constructor(game, socket, player) {
        this.game = game;
        this.socket = socket;
        this.player = player;
        this.opponent = null;
        this.points = 0;

        this.send(`Welcome player ${player}`);
        this.send(JSON.stringify(this.game.board));

        socket.on("data", (buffer) => {
            const command = buffer.toString("utf-8").trim();

            console.log(command);

            if (command === "QUIT") {
                socket.destroy();
            }
            else if (/^MOVE/.test(command)) {
                const [, location, destination] = command.split(' ');
                try {
                    this.game.move(JSON.parse(location), JSON.parse(destination), this);

                    this.opponent.send(`Your opponent moved: ${location} ${destination}`);
                    this.opponent.send(JSON.stringify(this.game.board));
                    this.send(JSON.stringify(this.game.board));
                } catch (e) {
                    this.send(`MESSAGE ${e.message}`);
                }
            }
        });

        socket.on("close", () => {
            try {
                this.opponent.send("Other player left.");
            } catch (e) { }
        });
    }

    send(message) {
        this.socket.write(`${message}\n`);
    }
}