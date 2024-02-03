const ClientObject = require('./classes/clientobject');
const dgram = require('dgram');
const server = dgram.createSocket('udp4');

var clients = [];

server.on('message', (msg, senderInfo) => {
    console.log(`Mensagem recebida: ${msg} from ${senderInfo.address}:${senderInfo.port}`);

    let random = Math.floor(Math.random() * 101);
    let random2 = Math.floor(Math.random() * 101);

    if (random < 90) {
        console.log("Pacote perdido:", msg);
        return;
    }

    if (random2 < 10) {
        console.log("Pacote duplicado:", msg);

        let client = clients.find(p => p.rinfo.address === senderInfo.address && p.rinfo.port === senderInfo.port);

        if (!client) {
            client = new ClientObject(senderInfo, server);
            clients.push(client);
        }

        client.onReceivedMessage(msg);
    }

    let client = clients.find(p => p.rinfo.address === senderInfo.address && p.rinfo.port === senderInfo.port);

    if (!client) {
        client = new ClientObject(senderInfo, server);
        clients.push(client);
    }

    client.onReceivedMessage(msg);
});

server.on('listening', () => {
    const address = server.address();
    console.log(`Server running on udp://${address.address}:${address.port}`);
});

server.bind(3000);