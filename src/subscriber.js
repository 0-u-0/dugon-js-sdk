import sdpTransform from 'sdp-transform';

import AsyncQueue from './asyncQueue';
import Transport from './transport';

import Receiver from './receiver';

import { getDtls } from './utils';
import Media from './media';
import Sdp from './sdp';


export default class Subscriber extends Transport {
  constructor(id, remoteICECandidates, remoteICEParameters, remoteDTLSParameters) {
    super(id, remoteICECandidates, remoteICEParameters, remoteDTLSParameters);

    this.receivers = new Map();

    this.asyncQueue = new AsyncQueue();

    this.state = Transport.TRANSPORT_NEW;

    this.isGotDtls = false;

    this.currentMid = 0;

  }

  removeReceiverByTokenId(tokenId) {
    for (let [_, receiver] of this.receivers) {
      if (tokenId === receiver.tokenId) {
        this.removeReceiver(receiver.senderId);
      }
    }
  }

  addReceiver(senderId, tokenId, receiverId, codec, metadata) {
    const mid = String(this.currentMid++);

    const media = Media.create(mid, codec, this.remoteICEParameters, this.remoteICECandidates, receiverId);

    const receiver = new Receiver(mid, senderId, tokenId, receiverId, codec, metadata, media);

    this.receivers.set(senderId, receiver);
    return receiver;
  }

  receive(senderId) {
    const receiver = this.receivers.get(senderId);
    if (receiver) {
      this.asyncQueue.push(this, this._receive, [receiver]);
    }
  }

  async _receive(receiver) {

    receiver.media.direction = "sendonly";
    let remoteSdp = this.generateSdp();

    await this.pc.setRemoteDescription(remoteSdp);

    //TODO: transceiver
    let answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    //track
    const transceiver = await this.pc.getTransceivers().find(t => t.mid === receiver.mid);
    receiver.transceiver = transceiver;
    this.ontrack(transceiver.receiver.track, receiver);

    //TODO: receiver resume
    if (!this.isGotDtls) {
      this.isGotDtls = true;
      //dtls
      let answerSdpObj = sdpTransform.parse(answer.sdp);
      let dtls = getDtls(answerSdpObj);

      this.ondtls(dtls);
    }

  }

  removeReceiver(senderId) {
    const receiver = this.receivers.get(senderId);
    if (receiver) {
      this.asyncQueue.push(this, this._removeReceiver, [receiver]);
    }
  }

  async _removeReceiver(receiver) {

    receiver.media.direction = 'inactive';
    let remoteSdp = this.generateSdp();

    await this.pc.setRemoteDescription(remoteSdp);
    let answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    this.onremovereceiver(receiver);
  }

  init() {
    this.pc = new RTCPeerConnection();
  }

  generateSdp() {

    let sdpObj = new Sdp();
    sdpObj.fingerprint = {
      algorithm: this.remoteDTLSParameters.fingerprint.algorithm,
      hash: this.remoteDTLSParameters.fingerprint.value
    }

    for (let [key, receiver] of this.receivers) {
      sdpObj.medias.push(receiver.media)
    }

    let sdp = sdpObj.toString();
    return new RTCSessionDescription({ type: 'offer', sdp: sdp });
  }

}

