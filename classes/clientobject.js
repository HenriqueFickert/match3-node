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
    }

    onReceivedMessage(message) {
        if (!this.bufferMessage(message))
            return;

        if (!this.packagesReceived[this.packagesReceived.length - 1])
            return;
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

            if (packageObject.type === REQUEST_TYPES.RESEND) {
                this.resendPackages(packageObject.ack);
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
                this.packagesSent.push(JSON.parse(message));
                this.packagesSent.sort((a, b) => a.sequence - b.sequence);
                this.packageSequence++;
            }
        });
    }
}

module.exports = ClientObject;