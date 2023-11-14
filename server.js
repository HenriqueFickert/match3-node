const ClientObject = require('./classes/clientobject');
const dgram = require('dgram');
const server = dgram.createSocket('udp4');

var clients = [];

server.on('message', (msg, senderInfo) => {
    console.log(`Server got: ${msg} from ${senderInfo.address}:${senderInfo.port}`);

    let client = clients.find(p => p.rinfo.address === senderInfo.address && p.rinfo.port === senderInfo.port);

    if (!client) {
        client = new ClientObject(senderInfo, server);
        clients.push(client);
    }

    client.receivedMessage(msg);
});

server.on('listening', () => {
    const address = server.address();
    console.log(`Server running on udp://${address.address}:${address.port}`);
});

server.bind(3000);