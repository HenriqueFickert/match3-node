const net = require('net');

let games = [];

const server = net.createServer((socket) => {
    console.log(`Connection from ${socket.remoteAddress} port ${socket.remotePort}`);

    let availableGame = games.find(game => game.players.length < game.maxPlayers);

    if (!availableGame) {
        availableGame = new Game(4);
        games.push(availableGame);
    }

    const player = new Player(availableGame, socket);
    availableGame.addPlayer(player);

    if (availableGame.players.length === availableGame.maxPlayers) {
        availableGame.startGame();
    }
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000/');
});

class Game {
    constructor(maxPlayers) {
        this.index = games.length;
        this.maxPlayers = maxPlayers;
        this.board = [];
        this.players = [];
        this.currentPlayerIndex = 0;
        this.generateBoard();
    }

    addPlayer(player) {
        this.players.push(player);
        player.send(`Welcome player ${player.playerIndex}`);
        player.send(JSON.stringify(this.board));

        if (this.players.length > 1) {
            this.players.forEach(element => {
                element.send("A player entered the room.");
            });
        }
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
        this.currentPlayer = this.players[this.currentPlayerIndex];

        this.players.forEach(element => {
            element.send("Game started.");

            if (element !== this.currentPlayer) {
                element.send(`Waiting for opponent's ${this.currentPlayer.playerIndex} move.`);
            } else {
                element.send("Your move.");
            }
        });
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

                this.players.forEach(element => {
                    element.send(JSON.stringify(this.board));
                });

                this.currentPlayer.points += matches.length;
                matches = this.checkForMatch();
            }
        }

        this.players.forEach(element => {
            this.players.forEach(element2 => {
                element.send(`player ${element2.playerIndex} points: ${element2.points}`);
            });
        });

        if (this.currentPlayer.playerIndex >= this.players.length - 1)
            this.currentPlayerIndex = 0;
        else
            this.currentPlayerIndex++;

        this.currentPlayer = this.players[this.currentPlayerIndex];

        this.players.forEach(element => {
            if (element !== this.currentPlayer)
                element.send(`Waiting for opponent's ${this.currentPlayer.playerIndex} move.`);
            else
                element.send("Your move.");
        });
    }

    isValidCoordinate(coord) {
        return coord.x >= 0 && coord.x < this.board.length &&
            coord.y >= 0 && coord.y < this.board[0].length;
    }

    swap(location, destination) {
        if (!this.isValidCoordinate(location) || !this.isValidCoordinate(destination)) {
            throw new Error("Invalid coordinates for swapping.");
        }

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
    constructor(game, socket) {
        this.game = game;
        this.socket = socket;
        this.playerIndex = game.players.length;
        this.points = 0;

        this.setupSocketEvents();
    }

    setupSocketEvents() {
        this.socket.on("data", (buffer) => {
            const command = buffer.toString("utf-8").trim();

            console.log(command);

            if (command === "QUIT") {
                this.socket.destroy();
            }
            else if (/^MOVE/.test(command)) {
                const [, location, destination] = command.split(' ');
                this.handleMoveCommand(location, destination);
            }
        });

        this.socket.on("close", () => {
            this.game.notifyPlayerDisconnection(this);
        });
    }

    handleMoveCommand(location, destination) {
        try {
            const parsedLocation = JSON.parse(location);
            const parsedDestination = JSON.parse(destination);

            if (!this.game.isValidCoordinate(parsedLocation) || !this.game.isValidCoordinate(parsedDestination)) {
                this.send("Invalid move coordinates.");
                return;
            }

            this.game.move(parsedLocation, parsedDestination, this);
        } catch (e) {
            this.send(`MESSAGE ${e.message}`);
        }
    }

    send(message) {
        this.socket.write(`${message}\n`);
    }
}

Game.prototype.notifyPlayerDisconnection = function (disconnectedPlayer) {
    this.players = this.players.filter(player => player !== disconnectedPlayer);
    this.players.forEach(player => {
        player.send(`The opponent ${disconnectedPlayer.playerIndex} has disconnected.`);
    });

    if (this.players.length === 0) {
        games = games.filter(game => game !== this);
    }
};
