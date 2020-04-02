export default class Receiver {
  constructor(producerId, tokenId, consumerId, kind, rtpParameters, metadata) {
    this.producerId = producerId;
    this.tokenId = tokenId;
    this.consumerId = consumerId;
    this.rtpParameters = rtpParameters;

    this.kind = kind;

    this.metadata = metadata;

    this.active = false;
  }
}
