const REQUEST_TYPES = require('./request-type');
const Package = require('./package');

class ClientObject {
    constructor(senderInfo, server) {
        this.rinfo = senderInfo;
        this.server = server;
        this.packagesSent = [];
        this.packagesReceived = [];
        this.packageSequence = 1;
        this.latestAck = 0;
        this.messageBuffered = '';
        this.timeoutTimer = null;
        this.startTimeoutTimer();
    }

    onReceivedMessage(message) {
        this.resetTimeoutTimer();

        if (!this.bufferMessage(message))
            return;

        if (!this.packagesReceived[this.packagesReceived.length - 1])
            return;

        var objectToBeUsed = this.getNextPackage();
        console.log("Objeto usado no jogo: ", objectToBeUsed, " Tamanho da lista de pacotes recebidos", this.packagesReceived.length);
    }

    bufferMessage(message) {
        this.messageBuffered += message;

        if (this.messageBuffered.includes('|')) {
            let messageParts = this.messageBuffered.split('|');
            this.messageBuffered = messageParts.pop();
            return messageParts.every(part => this.handleMessageParts(part));
        }

        return false;
    }

    handleMessageParts(messagePart) {
        try {
            let packageObject = JSON.parse(messagePart);

            if (!packageObject.protocolId || packageObject.protocolId !== 'MRQST')
                return false;

            console.log("Current Packaged Sequence Received: ", packageObject.sequence);
            console.log("Current ACK: ", this.latestAck);

            this.cleanUpSendPackages(packageObject.ack);

            if (packageObject.type === REQUEST_TYPES.RESEND) {
                this.resendPackages(packageObject.ack);
                return false;
            }

            if (packageObject.type === REQUEST_TYPES.TIMEOUT) {
                this.sendLastMessageAgain();
                return false;
            }

            return this.handlePackage(packageObject);
        } catch (error) {
            console.error('Error parsing message:', error);
            return false;
        }
    }

    handlePackage(packageObject) {
        if (packageObject.sequence <= this.latestAck) return true;

        if (packageObject.sequence === this.latestAck + 1) {
            this.latestAck = packageObject.sequence;
            this.addToReceivedPackages(packageObject);
        } else {
            this.requestMissingPackage();
            return false;
        }

        return true;
    }

    addToReceivedPackages(object) {
        if (!this.packagesReceived.some(item => item.sequence === object.sequence)) {
            this.packagesReceived.push(object);
            this.packagesReceived.sort((a, b) => a.sequence - b.sequence);
        }
    }

    cleanUpSendPackages(ack) {
        this.packagesSent = this.packagesSent.filter(pkg => pkg.sequence > ack);
    }

    getNextPackage() {
        if (this.packagesReceived.length > 0) {
            let firstPackage = this.packagesReceived[0];
            this.packagesReceived.shift();
            return firstPackage;
        }

        return null;
    }

    requestMissingPackage() {
        let requestResend = new Package(this.packageSequence, this.latestAck, '', REQUEST_TYPES.RESEND);
        this.sendMessage(requestResend);
    }

    resendPackages(ack) {
        if (this.packagesSent.length > 0) {
            this.packagesSent
                .filter(x => x.sequence > ack)
                .forEach(y => {
                    this.sendMessage(y, false);
                });
        }
    }

    sendMessage(messageToSend, addToPackages = true) {
        const message = JSON.stringify(messageToSend);
        const msgBuffer = Buffer.from(`${message}|`);

        this.server.send(msgBuffer, 0, msgBuffer.length, this.rinfo.port, this.rinfo.address, (err) => {
            if (err) {
                console.error(`Error sending message to ${this.rinfo.address}:${this.rinfo.port}: ${err}`);
            } else if (addToPackages) {
                const packageAdded = this.addPackageToSentList(JSON.parse(message));
                if (packageAdded) {
                    this.packageSequence++;
                }
            }
        });
    }

    addPackageToSentList(packageObject) {
        if (!this.packagesSent.some(p => p.sequence === packageObject.sequence)) {
            this.packagesSent.push(packageObject);
            this.packagesSent.sort((a, b) => a.sequence - b.sequence);
            return true;
        }

        return false;
    }

    startTimeoutTimer() {
        this.timeoutTimer = setTimeout(() => {
            this.handleTimeout();
        }, 3000);
    }

    resetTimeoutTimer() {
        clearTimeout(this.timeoutTimer);
        this.startTimeoutTimer();
    }

    handleTimeout() {
        console.log('Send a timeout request.');
        const timeoutMessage = new Package(this.packageSequence, this.latestAck, '', REQUEST_TYPES.TIMEOUT);
        this.sendMessage(timeoutMessage, false);
        this.resetTimeoutTimer();
    }

    sendLastMessageAgain() {
        if (this.packagesSent.length > 0) {
            let lastPackage = this.packagesSent[this.packagesSent.length - 1];
            this.sendMessage(lastPackage, false);
        }
    }
}

module.exports = ClientObject;