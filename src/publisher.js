import sdpTransform from 'sdp-transform';

import { getDtls } from './utils';
import AsyncQueue from './asyncQueue';
import Sender from './sender';

import Transport from './transport';
import Media from './media';
import Sdp from './sdp';

export default class Publisher extends Transport {
  constructor(id, remoteICECandidates, remoteICEParameters, remoteDTLSParameters) {
    super(id, remoteICECandidates, remoteICEParameters, remoteDTLSParameters);

    this.senders = [];

    //follow sdp stupid mid's order
    this.usedMids = [];

    this.asyncQueue = new AsyncQueue();
    // new 0 , initing 1 , inited 2 , ready 3
    this.state = 0;

    this.isGotDtls = false;

    this.localDTLSParameters = null;
  }

  init() {
    this.pc = new RTCPeerConnection({ iceServers: [], iceTransportPolicy: 'all', bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require', sdpSemantics: "unified-plan" });

    this.pc.onconnectionstatechange = event => {
      switch (this.pc.connectionState) {
        case "connected":
          this.state = 3;
          break;
        case "disconnected":
        case "failed":
          // One or more transports has terminated unexpectedly or in an error
          break;
        case "closed":
          // The connection has been closed
          break;
      }
    }
  }

  checkSender(senderId) {
    for (let sender of this.senders) {
      if ((senderId === sender.senderId) && sender.available) {
        return sender
      }
    }
    return null;
  }

  getLocalSdpData(sender, localSdp, codecCap) {
    let localSdpObj = sdpTransform.parse(localSdp.sdp);

    let mids = [];
    for (let media of localSdpObj.media) {
      mids.push(media.mid);
      if (media.mid == sender.mid) {
        sender.media = Media.merge(media, codecCap, this.remoteICEParameters, this.remoteICECandidates);
      }
    }

    this.usedMids = mids;
    //remote media

    if (false === this.isGotDtls) {
      this.isGotDtls = true;

      this.localDTLSParameters = getDtls(localSdpObj);

      this.ondtls(this.localDTLSParameters);
    }
  }

  send() {
    this.asyncQueue.push(this, this._send, [...arguments]);
  }

  async _send(track, codecCap) {
    const transceiver = await this.pc.addTransceiver(track, {
      direction: 'sendonly',
    });
    const sender = new Sender(track, transceiver, {
      test: 'test'
    });
    this.senders.push(sender);

    const localSdp = await this.pc.createOffer();
    await this.pc.setLocalDescription(localSdp);//mid after setLocalSdp

    this.getLocalSdpData(sender, localSdp, codecCap);

    let remoteSdp = this.generateSdp();

    await this.pc.setRemoteDescription(remoteSdp);


    this.onsender(sender);
  }

  stopSender(senderId) {
    this.asyncQueue.push(this, this._stopSender, [senderId]);
  }

  async _stopSender(senderId) {
    //TODO: check sender 
    for (let sender of this.senders) {
      if (sender.senderId === senderId) {
        this.pc.removeTrack(sender.transceiver.sender);

        let localSdp = await this.pc.createOffer();

        await this.pc.setLocalDescription(localSdp);

        let localSdpObj = sdpTransform.parse(localSdp.sdp);
        this.usedMids = localSdpObj.media.map(m =>m.mid)

        let remoteSdp = this.generateSdp();
        await this.pc.setRemoteDescription(remoteSdp);

        this.onsenderclosed(sender.senderId);
      }
    }
  }

  generateSdp() {
    // const lines = [];
    // lines.push(`v=0`);
    // //TODO: use random id
    // lines.push(`o=- 10000 2 IN IP4 127.0.0.1`);
    // lines.push(`s=-`);
    // lines.push(`t=0 0`);
    // lines.push(`a=ice-lite`);

    // const groupLength = lines.push(`a=group:BUNDLE `);
    // lines.push(`a=msid-semantic: WMS *`);
    // lines.push(`a=fingerprint:${this.remoteDTLSParameters.fingerprint.algorithm} ${this.remoteDTLSParameters.fingerprint.value}`);

    // let mids = [];
    // for (let sender of this.senders) {
    //   //is stopped remove sdp
    //   if (!sender.isStopped || sender.mid === '0') {
    //     if (sender.available || sender.mid === '0') {
    //       mids.push(sender.mid);
    //     }
    //     lines.push(sender.toSdp(this.remoteICEParameters, this.remoteICECandidates));
    //   }
    // }

    // //add BUNDLE
    // lines[groupLength - 1] = lines[groupLength - 1] + mids.join(' ');

    // let sdp = lines.join('\r\n');
    // sdp = sdp + '\r\n';
    let sdpObj = new Sdp();
    sdpObj.fingerprint = {
      algorithm: this.remoteDTLSParameters.fingerprint.algorithm,
      hash: this.remoteDTLSParameters.fingerprint.value
    }

    for (let mid of this.usedMids) {
      let sender = this.senders.find(s =>s.mid == String(mid))
      if (sender) {
        sdpObj.medias.push(sender.media)
      }
    }

    let sdp = sdpObj.toString();
    return new RTCSessionDescription({ type: 'answer', sdp: sdp });

  }


}