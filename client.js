const Package = require('./classes/package');
const REQUEST_TYPES = require('./classes/request-type');

const readline = require('readline');
const dgram = require('dgram');
const client = dgram.createSocket('udp4');

const serverHost = '127.0.0.1';
const serverPort = 3000;

var packagesSent = [];
var packagesReceived = [];
var packageSequence = 1;
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
    sendMessage(object);
});

client.on('message', (msg) => {
    receivedMessage(msg);
});

function receivedMessage(message) {
    if (!bufferMessage(message))
        return;

    if (!packagesReceived[packagesReceived.length - 1])
        return;

    console.log("Server: ", packagesReceived[packagesReceived.length - 1]);
}

function bufferMessage(message) {
    messageBuffered += message;

    if (messageBuffered.indexOf('|')) {
        let messageParts = messageBuffered.split('|');
        messageBuffered = messageParts.pop();
        return messageParts.every(part => handleMessageParts(part));
    }

    return false;
}

function handleMessageParts(messagePart) {
    try {
        let object = JSON.parse(messagePart);

        if (!object.protocolId || object.protocolId !== 'MRQST')
            return false;

        if (object.type === REQUEST_TYPES.RESEND) {
            resendPackages(object.ack);
            return false;
        }

        return handlePackage(packageObject);
    } catch (e) {
        console.error('Error parsing message:', e);
        return false;
    }
}

function handlePackage(packageObject) {
    if (packageObject.sequence <= latestAck) return true;

    if (packageObject.sequence === latestAck + 1) {
        latestAck = packageObject.sequence;
        addToReceivedPackages(packageObject);
    } else {
        requestMissingPackage();
        return false;
    }

    return true;
}

function addToReceivedPackages(object) {
    if (!packagesReceived.some(item => item.sequence === object.sequence)) {
        packagesReceived.push(object);
        packagesReceived.sort((a, b) => a.sequence - b.sequence);
    }
}

function requestMissingPackage() {
    let requestResend = new Package(packageSequence, latestAck, '', REQUEST_TYPES.RESEND);
    sendMessage(requestResend);
}

function resendPackages(ack) {
    if (packagesSent.length > 0) {
        packagesSent
            .filter(x => x.sequence > ack)
            .forEach(y => {
                sendMessage(y, false);
            });
    }
}

function sendMessage(messageToSend, addToPackages = true) {
    const message = JSON.stringify(messageToSend);
    const msgBuffer = Buffer.from(`${message}|`);

    console.log(message);

    client.send(msgBuffer, 0, msgBuffer.length, serverPort, serverHost, (err) => {
        if (err) {
            console.error(`Error sending message to ${serverHost}:${serverHost}: ${err}`);
        } else if (addToPackages) {
            packagesSent.push(JSON.parse(message));
            packagesSent.sort((a, b) => a.sequence - b.sequence);
            packageSequence++;
        }
    });
}