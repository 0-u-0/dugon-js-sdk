export default class Receiver {
  constructor(senderId, tokenId, receiverId, kind, rtpParameters, senderPaused, metadata) {
    this.senderId = senderId;
    this.tokenId = tokenId;
    this.receiverId = receiverId;
    this.rtpParameters = rtpParameters;

    this.kind = kind;

    this.senderPaused = senderPaused;

    this.metadata = metadata;

    this.active = false;
  }
}
