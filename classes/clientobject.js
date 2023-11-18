// const REQUEST_TYPES = require('./request-type');
// const Package = require('./package');

// class ClientObject {
//     constructor(senderInfo, server) {
//         this.rinfo = senderInfo;
//         this.server = server;
//         this.packagesSent = [];
//         this.packagesReceived = [];
//         this.packageSequence = 1;
//         this.latestAck = 0;
//         this.messageBuffered = '';
//     }

//     receivedMessage(message) {
//         if (!this.receivedMessageBufferHandler(message))
//             return;

//         if (!this.packagesReceived[this.packagesReceived.length - 1])
//             return;

//         let object = new Package(this.packageSequence, this.latestAck, '123', REQUEST_TYPES.RES);
//         this.sendMessage(JSON.stringify(object));
//     }

//     receivedMessageBufferHandler(message) {
//         this.messageBuffered += message;

//         if (this.messageBuffered.indexOf('|')) {
//             let messageParts = this.messageBuffered.split('|');

//             this.messageBuffered = messageParts.pop();

//             for (let part of messageParts) {
//                 if (this.DiscartableMessageHandler(part))
//                     return true;
//             }
//         }

//         return false;
//     }

//     DiscartableMessageHandler(messagePart) {
//         try {
//             let object = JSON.parse(messagePart);

//             if (!object.protocolId || object.protocolId !== 'MRQST')
//                 return false;

//             if (object.REQUEST_TYPES === REQUEST_TYPES.RESEND) {
//                 this.resendPackage();

//             }

//             if (object.sequence === this.latestAck + 1) {
//                 this.latestAck = object.sequence;
//                 this.addToReceivedPackages(object);
//             }
//             else if (object.sequence > this.latestAck + 1) {
//                 this.requestMissingPackage();

//                 // 

//                 // console.log("objeto perdido: ", rescuedObject);
//                 // rescuedObject.REQUEST_TYPES = REQUEST_TYPES.ACK;
//                 // this.sendMessage(JSON.stringify(rescuedObject));

//                 //PEDIR PARA REENVIAR A MENSAGEM TALVEZ UTILIZAR O TIPO DE ACK
//                 return false;
//             } else {
//                 return false;
//             }

//             return true;
//         } catch (e) {
//             console.error('Error parsing message:', e);
//             return false;
//         }
//     }

//     addToReceivedPackages(object) {
//         if (!this.packagesReceived.some(item => item.sequence === object.sequence)) {
//             this.packagesReceived.push(object);
//             this.packagesReceived.sort((a, b) => a.sequence - b.sequence);
//         }
//     }

//     requestMissingPackage() {
//         let requestResend = new Package(this.packageSequence, this.latestAck, '', REQUEST_TYPES.RESEND);
//         this.sendMessage(JSON.stringify(requestResend));
//     }

//     resendPackage() {
//         let rescuedObject = this.packagesReceived.find(x => x.sequence === this.latestAck);
//         this.sendMessage(JSON.stringify(rescuedObject));
//     }

//     sendMessage(message) {
//         const msgBuffer = this.sendMessageBufferHandler(message);

//         this.server.send(msgBuffer, 0, msgBuffer.length, this.rinfo.port, this.rinfo.address, (err) => {
//             if (err) {
//                 console.error(`Error sending message to ${this.rinfo.address}:${this.rinfo.port}: ${err}`);
//             } else {
//                 this.packagesSent.push(message);
//                 this.packageSequence++;
//             }
//         });
//     }

//     sendMessageBufferHandler(message) {
//         let content = Buffer.from(`${message}|`);
//         return content;
//     }
// }

// module.exports = ClientObject;



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

    receivedMessage(message) {
        if (!this.receivedMessageBufferHandler(message))
            return;

        if (!this.packagesReceived[this.packagesReceived.length - 1])
            return;

        // this.sendMessage(JSON.stringify(this.packagesReceived[this.packagesReceived.length - 1]));
    }

    receivedMessageBufferHandler(message) {
        this.messageBuffered += message;

        if (this.messageBuffered.includes('|')) {
            let messageParts = this.messageBuffered.split('|');
            this.messageBuffered = messageParts.pop();

            messageParts.forEach(part => {
                if (!this.discartableMessageHandler(part))
                    return false;
            });

            return true;
        }
        return false;
    }

    discartableMessageHandler(messagePart) {
        try {
            let object = JSON.parse(messagePart);

            if (!object.protocolId || object.protocolId !== 'MRQST')
                return false;

            if (object.type === REQUEST_TYPES.RESEND) {
                this.resendPackage(object.ack);
                return false;
            }

            if (object.sequence === this.latestAck + 1) {
                this.latestAck = object.sequence;
                this.addToReceivedPackages(object);
            } else if (object.sequence > this.latestAck + 1) {
                this.requestMissingPackage();
                return false;
            }

            return true;
        } catch (e) {
            console.error('Error parsing message:', e);
            return false;
        }
    }

    addToReceivedPackages(object) {
        if (!this.packagesReceived.some(item => item.sequence === object.sequence)) {
            this.packagesReceived.push(object);
            this.packagesReceived.sort((a, b) => a.sequence - b.sequence);
        }
    }

    requestMissingPackage() {
        let requestResend = new Package(this.packageSequence, this.latestAck, '', REQUEST_TYPES.RESEND);
        this.sendMessage(JSON.stringify(requestResend));
    }

    resendPackage(ack) {
        if (this.packagesSent.length > 0) {
            let lastReceivedPackage = this.packagesSent.find(x => x.sequence === ack + 1);
            this.sendMessage(JSON.stringify(lastReceivedPackage));
            //REENVIAR TODAS AS MENSAGENS APÓS A PERDIDA
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
