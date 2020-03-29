import AsyncQueue from './asyncQueue';

class Receiver {
  constructor(producerId, tokenId) {
    this.producerId = producerId;
    this.tokenId = tokenId;

    this.consumerId = null;
  }
}

export default class Subscriber {
  constructor(transportParamaters) {
    this.id = null;
    this.pc = null;
 
    this.receivers = [];

    this.asyncQueue = new AsyncQueue();
  }

  addReceiver(producerId, tokenId) {
    const receiver = new Receiver(producerId,tokenId);
    this.receivers.push(receiver);
    return receiver;
  }



}