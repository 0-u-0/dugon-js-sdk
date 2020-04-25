import sdpTransform from 'sdp-transform';

import AsyncQueue from './asyncQueue';
import Transport from './transport';

import Receiver from './receiver';

import { getDtls } from './utils';


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
    if (!receiver.active) {
      receiver.active = true;
    }

    let remoteSdp = this.generateSdp();

    await this.pc.setRemoteDescription(remoteSdp);

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
    if (receiver && receiver.active) {
      this.asyncQueue.push(this, this._removeReceiver, [receiver]);
    }
  }

  async _removeReceiver(receiver) {
    receiver.active = false;

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
    const lines = [];
    lines.push(`v=0`);
    //TODO: use random id
    lines.push(`o=- 10000 2 IN IP4 127.0.0.1`);
    lines.push(`s=-`);
    lines.push(`t=0 0`);
    lines.push(`a=ice-lite`);

    const groupLength = lines.push(`a=group:BUNDLE `);
    lines.push(`a=msid-semantic: WMS`);
    lines.push(`a=fingerprint:${this.remoteDTLSParameters.fingerprint.algorithm} ${this.remoteDTLSParameters.fingerprint.value}`);

    let mids = [];
    for (let [key, receiver] of this.receivers) {
      //is stopped remove sdp
      lines.push(receiver.toSdp(this.remoteICEParameters, this.remoteICECandidates));
      mids.push(receiver.mid);
    }

    //add BUNDLE
    lines[groupLength - 1] = lines[groupLength - 1] + mids.join(' ');

    let sdp = lines.join('\r\n');
    sdp = sdp + '\r\n';

    return new RTCSessionDescription({ type: 'offer', sdp: sdp });
  }

}

