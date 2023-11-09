const Game = require('./classes/game');
const Player = require('./classes/player');
const dgram = require('dgram');
const server = dgram.createSocket('udp4');

let games = [];

server.on('message', (msg, senderInfo) => {
    console.log(`Server got: ${msg} from ${senderInfo.address}:${senderInfo.port}`);

    let game = games.find(g => g.players.some(p => p.rinfo.address === senderInfo.address && p.rinfo.port === senderInfo.port));
    let playerInMatch = game?.players.find(p => p.rinfo.address === senderInfo.address && p.rinfo.port === senderInfo.port);

    if (!playerInMatch) {
        handleGameLobbies(senderInfo);
    }
    else {
        playerInMatch.handlePlayerCommand(msg.toString().trim());
    }
});

server.on('listening', () => {
    const address = server.address();
    console.log(`Server running on udp://${address.address}:${address.port}`);
});

server.bind(3000);

function handleGameLobbies(senderInfo) {
    let availableGame = games.find(game => !game.isFull());

    if (!availableGame) {
        availableGame = new Game(3, games.length);
        games.push(availableGame);
    }

    const player = new Player(availableGame, senderInfo, server);
    availableGame.addPlayer(player);
}