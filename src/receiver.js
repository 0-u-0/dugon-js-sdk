import Media from './media';

export default class Receiver {
  constructor(mid,senderId, tokenId, receiverId, rtpParameters, metadata) {
    this.senderId = senderId;
    this.tokenId = tokenId;
    this.receiverId = receiverId;
    this.rtpParameters = rtpParameters;

    this.metadata = metadata;

    this.active = false;
    this.mid = mid;

    this.media = new Media(this.rtpParameters.kind,'sendonly',this.rtpParameters.codecName,
    this.rtpParameters.payloadType,this.rtpParameters.clockRate,this.mid,this.rtpParameters.cname,
    this.rtpParameters.channels,this.rtpParameters.parameters,this.rtpParameters.ssrc,
    this.rtpParameters.rtcpFeedback,this.rtpParameters.ext,this.rtpParameters.rtx,'UDP/TLS/RTP/SAVPF')
  }

  get kind(){
    return this.rtpParameters.kind;
  }

  get senderPaused(){
    return this.rtpParameters.senderPaused;
  }

  toSdp(iceParameters, candidates){
    return this.media.toSdp2(iceParameters, candidates,this.active,this.receiverId);
  }

}
