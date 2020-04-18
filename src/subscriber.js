import sdpTransform from 'sdp-transform';

import AsyncQueue from './asyncQueue';
import Transport from './transport';

import Receiver from './receiver';

import { getDtls } from './utils';

import { subRemoteSdpGen } from './utils';


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

  addReceiver(senderId, tokenId, receiverId, kind, rtpParameters, senderPaused, metadata) {
    const receiver = new Receiver(senderId, tokenId, receiverId, kind, rtpParameters, senderPaused, metadata);
    receiver.mid = String(this.currentMid++);
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

    let remoteSdp = subRemoteSdpGen(this.receivers, this.remoteICECandidates,
      this.remoteICEParameters, this.remoteDTLSParameters);

    await this.pc.setRemoteDescription(new RTCSessionDescription({
      type: 'offer',
      sdp: remoteSdp
    }))
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

    let remoteSdp = subRemoteSdpGen(this.receivers, this.remoteICECandidates,
      this.remoteICEParameters, this.remoteDTLSParameters);

    await this.pc.setRemoteDescription(new RTCSessionDescription({
      type: 'offer',
      sdp: remoteSdp
    }))
    let answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    this.onremovereceiver(receiver);
  }

  init() {
    this.pc = new RTCPeerConnection();
  }
}

