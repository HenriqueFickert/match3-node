class Player {
    constructor(game, senderInfo, server) {
        this.game = game;
        this.rinfo = senderInfo;
        this.playerIndex = game.players.length;
        this.points = 0;
        this.server = server;
    }

    handlePlayerCommand(message) {
        try {
            if (message.startsWith('MOVE')) {
                const parts = message.match(/MOVE (\{.*?\}) (\{.*?\})/);
                if (parts && parts.length === 3) {
                    this.handleMoveCommand(parts[1], parts[2]);
                } else {
                    throw new Error('Invalid MOVE format. Expected: MOVE {"x":1,"y":0} {"x":0,"y":1}');
                }
            } else if (message === 'QUIT') {
                this.disconectPlayer();
            } else {
                throw new Error('Unknown command.');
            }
        } catch (e) {
            this.send(`ERROR ${e.message}`);
        }
    }

    handleMoveCommand(location, destination) {
        try {
            const parsedLocation = JSON.parse(location);
            const parsedDestination = JSON.parse(destination);

            this.game.move(parsedLocation, parsedDestination, this);
        } catch (e) {
            this.send(`ERROR ${e.message}`);
        }
    }

    send(message) {
        const msgBuffer = Buffer.from(`${message}\n`);
        this.server.send(msgBuffer, 0, msgBuffer.length, this.rinfo.port, this.rinfo.address, (err) => {
            if (err) {
                console.error(`Error sending message to ${this.rinfo.address}:${this.rinfo.port}: ${err}`);
            }
        });
    }

    disconectPlayer() {
        this.game.handlePlayerDisconnection(this);
    }
}

module.exports = Player;