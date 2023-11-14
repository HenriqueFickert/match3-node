const Package = require('./classes/package');
const REQUEST_TYPES = require('./classes/request-type');

const readline = require('readline');
const dgram = require('dgram');
const client = dgram.createSocket('udp4');

const serverHost = '127.0.0.1';
const serverPort = 3000;

var packagesSent = [];
var packagesRecived = [];
var packageSequence = 0;
var latestAck = 0;
var messageBuffered = '';

client.on('error', (err) => {
    console.error(`Client error: ${err.stack}`);
    client.close();
    process.exit();
});

client.on('close', () => {
    console.log('Socket closed.');
    process.exit();
});

const reader = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'Enter command:'
});

reader.prompt();

reader.on('line', (line) => {
    let object = new Package(packageSequence, latestAck, '123', REQUEST_TYPES.RES);
    sendMessage(JSON.stringify(object));
});

function sendMessage(message) {
    const msgBuffer = sendMessageBufferHandler(message);

    console.log(message);

    client.send(msgBuffer, 0, msgBuffer.length, serverPort, serverHost, (err) => {
        if (err) {
            console.error(`Error sending message to ${serverHost}:${serverHost}: ${err}`);
        } else {
            packagesSent.push(JSON.parse(message));
            packageSequence++;
        }
    });
}

client.on('message', (msg) => {
    receivedMessage(msg);
});

function receivedMessage(message) {
    if (!receivedMessageBufferHandler(message))
        return;

    receivedObject = packagesRecived[packagesRecived.length - 1];

    if (receivedObject.sequence > latestAck)
        latestAck = receivedObject.sequence;

    packagesRecived.sort(function (x, y) {
        return x.sequence - y.sequence;
    });

    // let object = new Package(packageSequence, latestAck, '123', REQUEST_TYPES.RES);
    // sendMessage(object);

    // Criar a logica de quando perder a mensagem e chegar uma nova solicitar a antiga 
}

function receivedMessageBufferHandler(message) {
    messageBuffered += message;

    if (messageBuffered.endsWith('|')) {
        messageBuffered = messageBuffered.slice(0, -1);
        let validMessage = DiscartableMessageHandler();
        messageBuffered = '';
        return validMessage;
    }

    return false;
}

function DiscartableMessageHandler() {
    let object = JSON.parse(messageBuffered);

    if (!object.protocolId || object.protocolId !== 'MRQST')
        return false;

    packagesRecived.push(object);
    return true;
}

function sendMessageBufferHandler(message) {
    let content = Buffer.from(`${message}|`);
    return content;
}