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
var timeoutTimer = null;
// startTimeoutTimer();

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
    resetTimeoutTimer();

    if (!bufferMessage(message))
        return;

    if (!packagesReceived[packagesReceived.length - 1])
        return;

    console.log("Server: ", packagesReceived[packagesReceived.length - 1]);

    var objectToBeUsed = getNextPackage();
    console.log("Objeto usado no jogo:", objectToBeUsed, " Tamanho da lista de pacotes recebidos", packagesReceived.length);
}

function bufferMessage(message) {
    messageBuffered += message;

    if (messageBuffered.includes('|')) {
        let messageParts = messageBuffered.split('|');
        messageBuffered = messageParts.pop();
        return messageParts.every(part => handleMessageParts(part));
    }

    return false;
}

function handleMessageParts(messagePart) {
    try {
        let packageObject = JSON.parse(messagePart);

        if (!packageObject.protocolId || packageObject.protocolId !== 'MRQST')
            return false;

        if (packageObject.type === REQUEST_TYPES.RESEND) {
            resendPackages(packageObject.ack);
            return false;
        }

        if (packageObject.type === REQUEST_TYPES.TIMEOUT) {
            sendLastMessageAgain();
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
        cleanUpPackages();
    } else {
        requestMissingPackage();
        return false;
    }

    return true;
}

function addToReceivedPackages(object) {
    if (!packagesReceived.some(item => item.sequence === object.sequence)) {
        packagesReceived = packagesReceived.filter(x => x.ack < latestAck);
        packagesReceived.push(object);
        packagesReceived.sort((a, b) => a.sequence - b.sequence);
    }
}

function cleanUpPackages() {
    packagesSent = packagesSent.filter(pkg => pkg.sequence > latestAck);
}

function getNextPackage() {
    if (packagesReceived.length > 0) {
        let firstPackage = packagesReceived[0];
        packagesReceived.shift();
        return firstPackage;
    }

    return null;
}


function requestMissingPackage() {
    let requestResend = new Package(packageSequence, latestAck, '', REQUEST_TYPES.RESEND);
    sendMessage(requestResend);
}

function resendPackages(ack) {
    console.log("ACK Received: ", ack);

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
            const packageAdded = addPackageToSentList(JSON.parse(message));
            if (packageAdded) {
                packageSequence++;
            }
        }
    });
}

function addPackageToSentList(packageObject) {
    if (!packagesSent.some(p => p.sequence === packageObject.sequence)) {
        packagesSent.push(packageObject);
        packagesSent.sort((a, b) => a.sequence - b.sequence);
        return true;
    }

    return false;
}

function startTimeoutTimer() {
    timeoutTimer = setTimeout(() => {
        handleTimeout();
    }, 3000);
}

function resetTimeoutTimer() {
    clearTimeout(timeoutTimer);
    startTimeoutTimer();
}

function handleTimeout() {
    console.log('Send a timeout request.');
    const timeoutMessage = new Package(packageSequence, latestAck, '', REQUEST_TYPES.TIMEOUT);
    sendMessage(timeoutMessage, false);
}

function sendLastMessageAgain() {
    if (packagesSent.length > 0) {
        let lastElement = packagesSent[packagesSent.length - 1];
        sendMessage(lastElement, false);
    }
}