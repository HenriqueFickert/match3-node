// class Player {
//     constructor(game, senderInfo, server) {
//         this.game = game;
//         this.rinfo = senderInfo;
//         this.playerIndex = game.players.length;
//         this.points = 0;
//         this.server = server;
//     }

//     handlePlayerCommand(message) {
//         if (message.startsWith('MOVE')) {
//             const [location, destination] = message.split(' ');
//             this.handleMoveCommand(location, destination);
//         } else if (message === 'QUIT') {
//             this.game.notifyPlayerDisconnection(this);
//         }
//     }

//     handleMoveCommand(location, destination) {
//         try {
//             const parsedLocation = JSON.parse(location);
//             const parsedDestination = JSON.parse(destination);

//             if (!this.game.isValidCoordinate(parsedLocation) || !this.game.isValidCoordinate(parsedDestination)) {
//                 this.send("Invalid move coordinates.");
//                 return;
//             }

//             this.game.move(parsedLocation, parsedDestination, this);
//         } catch (e) {
//             this.send(`MESSAGE ${e.message}`);
//         }
//     }

//     send(message) {
//         const msgBuffer = Buffer.from(`${message}\n`);
//         this.server.send(msgBuffer, 0, msgBuffer.length, this.rinfo.port, this.rinfo.address, (err) => {
//             if (err) console.error(err);
//         });
//     }
// }

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
                // Espera-se que a mensagem seja algo como "MOVE <json> <json>"
                const parts = message.match(/MOVE (\{.*?\}) (\{.*?\})/);
                if (parts && parts.length === 3) {
                    this.handleMoveCommand(parts[1], parts[2]);
                } else {
                    throw new Error('Invalid MOVE format. Expected: MOVE {"x":1,"y":0} {"x":0,"y":1}');
                }
            } else if (message === 'QUIT') {
                this.game.notifyPlayerDisconnection(this);
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

            if (!this.game.isValidCoordinate(parsedLocation) || !this.game.isValidCoordinate(parsedDestination)) {
                throw new Error("Invalid move coordinates.");
            }

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
}

module.exports = Player;