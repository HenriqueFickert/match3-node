const Package = require('./classes/package');
const ClientManager = require('./classes/clientmanager');
const REQUEST_TYPES = require('./classes/request-type');
const dgram = require('dgram');
const server = dgram.createSocket('udp4');

var clients = [];

server.on('message', (msg, senderInfo) => {
    console.log(`Server got: ${msg} from ${senderInfo.address}:${senderInfo.port}`);

    let client = clients.find(p => p.rinfo.address === senderInfo.address && p.rinfo.port === senderInfo.port);

    if (!client) {
        client = new ClientManager(senderInfo, server);
        clients.push(client);
    }

    client.recievedMessage(msg);
});

server.on('listening', () => {
    const address = server.address();
    console.log(`Server running on udp://${address.address}:${address.port}`);
});

server.bind(3000);

function createMessage(data, type) {
    return new Package(this.localSequenceNumber, this.latestPackageNumerRecieved, data, type);
}