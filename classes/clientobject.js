const REQUEST_TYPES = require('./request-type');
const Package = require('./package');

class ClientObject {
    constructor(senderInfo, server) {
        this.rinfo = senderInfo;
        this.server = server;
        this.packagesSent = [];
        this.packagesReceived = [];
        this.packageSequence = 0;
        this.latestAck = 0;
        this.messageBuffered = '';
    }

    receivedMessage(message) {
        if (!this.receivedMessageBufferHandler(message))
            return;

        let receivedObject = this.packagesReceived[this.packagesReceived.length - 1];

        if (receivedObject.sequence === this.latestAck + 1)
            this.latestAck = receivedObject.sequence;
        else
            return;

        let object = new Package(this.packageSequence, this.latestAck, '123', REQUEST_TYPES.RES);
        this.sendMessage(JSON.stringify(object));
    }

    receivedMessageBufferHandler(message) {
        this.messageBuffered += message;

        if (this.messageBuffered.endsWith('|')) {
            let messageParts = this.messageBuffered.split('|');

            this.messageBuffered = messageParts.pop();

            for (let part of messageParts) {
                if (this.DiscartableMessageHandler(part))
                    return true;
            }
        }

        return false;
    }

    DiscartableMessageHandler(messagePart) {
        try {
            let object = JSON.parse(messagePart);

            if (!object.protocolId || object.protocolId !== 'MRQST')
                return false;

            this.packagesReceived.push(object);
            return true;
        } catch (e) {
            console.error('Error parsing message:', e);
            return false;
        }
    }

    sendMessage(message) {
        const msgBuffer = this.sendMessageBufferHandler(message);

        this.server.send(msgBuffer, 0, msgBuffer.length, this.rinfo.port, this.rinfo.address, (err) => {
            if (err) {
                console.error(`Error sending message to ${this.rinfo.address}:${this.rinfo.port}: ${err}`);
            } else {
                this.packagesSent.push(message);
                this.packageSequence++;
            }
        });
    }

    sendMessageBufferHandler(message) {
        let content = Buffer.from(`${message}|`);
        return content;
    }
}

module.exports = ClientObject;