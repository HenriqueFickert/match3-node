const Package = require('./classes/package');
const REQUEST_TYPES = require('./classes/request-type');

const readline = require('readline');
const dgram = require('dgram');
const client = dgram.createSocket('udp4');

const serverHost = '127.0.0.1';
const serverPort = 3000;

var packagesSent = [];
var packagesReceived = [];
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
    let object = new Package(packageSequence, latestAck, line, REQUEST_TYPES.REQ);
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

    let receivedObject = packagesReceived[packagesReceived.length - 1];

    if (receivedObject.sequence === latestAck + 1)
        latestAck = receivedObject.sequence;
    else
        return;

    //

    console.log("Server: ", receivedObject)
    // let object = new Package(this.packageSequence, this.latestAck, '123', REQUEST_TYPES.REQ);
    // sendMessage(JSON.stringify(object));
}

function receivedMessageBufferHandler(message) {
    messageBuffered += message;

    if (messageBuffered.endsWith('|')) {
        let messageParts = messageBuffered.split('|');
        messageBuffered = messageParts.pop();

        for (let part of messageParts) {
            if (DiscartableMessageHandler(part))
                return true;
        }
    }

    return false;
}

function DiscartableMessageHandler(messagePart) {
    try {
        let object = JSON.parse(messagePart);

        if (!object.protocolId || object.protocolId !== 'MRQST')
            return false;

        packagesReceived.push(object);
        return true;
    } catch (e) {
        console.error('Error parsing message:', e);
        return false;
    }
}

function sendMessageBufferHandler(message) {
    let content = Buffer.from(`${message}|`);
    return content;
}