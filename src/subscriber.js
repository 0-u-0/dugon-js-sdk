import sdpTransform from 'sdp-transform';

import AsyncQueue from './asyncQueue';
import Transport from './transport';

import Receiver from './receiver';

import { getDtls } from './utils';


function remoteSdpGenerator(receivers, remoteICECandidates, remoteICEParameters, remoteDTLSParameters) {

  const sdpTemplate = {
    "version": 0,
    "origin": {
      "username": "mediasoup-client",
      "sessionId": 10000,
      "sessionVersion": 1,
      "netType": "IN",
      "ipVer": 4,
      "address": "0.0.0.0"
    },
    "name": "-",
    "timing": {
      "start": 0,
      "stop": 0
    },
    "icelite": "ice-lite",
    "fingerprint": {},
    "msidSemantic": {
      "semantic": "WMS",
      "token": "*"
    },
    "groups": [
      {
        "type": "BUNDLE",
        "mids": 0
      }
    ],
    "media": []
  }

  const audioTemplate = {
    "rtp": [
      {
        "payload": 100,
        "codec": "opus",
        "rate": 48000,
        "encoding": 2
      }
    ],
    "fmtp": [
      {
        "payload": 100,
        "config": "minptime=10;useinbandfec=1;sprop-stereo=1;usedtx=1"
      }
    ],
    "type": "audio",
    "port": 7,
    "protocol": "UDP/TLS/RTP/SAVPF",
    "payloads": 100,
    "connection": {
      "version": 4,
      "ip": "127.0.0.1"
    },
    "ext": [
      {
        "value": 4,
        "uri": "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time"
      },
      {
        "value": 10,
        "uri": "urn:ietf:params:rtp-hdrext:ssrc-audio-level"
      }
    ],
    "setup": "actpass",
    "mid": 0,
    "msid": "",
    "direction": "sendonly",
    "iceUfrag": "",
    "icePwd": "",
    "candidates": [],
    "endOfCandidates": "end-of-candidates",
    "iceOptions": "renomination",
    "ssrcs": [],
    "rtcpMux": "rtcp-mux",
    "rtcpRsize": "rtcp-rsize"
  }

  const inactiveAudioTemplate = {
    "rtp": [
      {
        "payload": 100,
        "codec": "opus",
        "rate": 48000,
        "encoding": 2
      }
    ],
    "fmtp": [
      {
        "payload": 100,
        "config": "minptime=10;useinbandfec=1;sprop-stereo=1;usedtx=1"
      }
    ],
    "type": "audio",
    "port": 7,
    "protocol": "UDP/TLS/RTP/SAVPF",
    "payloads": 100,
    "connection": {
      "version": 4,
      "ip": "127.0.0.1"
    },
    "setup": "actpass",
    "mid": 0,
    "msid": "",
    "direction": "inactive",
    "iceUfrag": "",
    "icePwd": "",
    "candidates": [],
    "endOfCandidates": "end-of-candidates",
    "iceOptions": "renomination",
    "ssrcs": [],
    "rtcpMux": "rtcp-mux",
    "rtcpRsize": "rtcp-rsize"
  }

  const videoTemplate = {
    "rtp": [
      {
        "payload": 101,
        "codec": "VP8",
        "rate": 90000
      },
      {
        "payload": 102,
        "codec": "rtx",
        "rate": 90000
      }
    ],
    "fmtp": [
      {
        "payload": 102,
        "config": "apt=101"
      }
    ],
    "type": "video",
    "port": 7,
    "protocol": "UDP/TLS/RTP/SAVPF",
    "payloads": "101 102",
    "connection": {
      "version": 4,
      "ip": "127.0.0.1"
    },
    "rtcpFb": [
      {
        "payload": 101,
        "type": "transport-cc",
        "subtype": ""
      },
      {
        "payload": 101,
        "type": "ccm",
        "subtype": "fir"
      },
      {
        "payload": 101,
        "type": "nack",
        "subtype": ""
      },
      {
        "payload": 101,
        "type": "nack",
        "subtype": "pli"
      }
    ],
    "ext": [
      {
        "value": 4,
        "uri": "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time"
      },
      {
        "value": 5,
        "uri": "http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01"
      },
      {
        "value": 6,
        "uri": "http://tools.ietf.org/html/draft-ietf-avtext-framemarking-07"
      },
      {
        "value": 11,
        "uri": "urn:3gpp:video-orientation"
      },
      {
        "value": 12,
        "uri": "urn:ietf:params:rtp-hdrext:toffset"
      }
    ],
    "setup": "actpass",
    "mid": 1,
    "msid": "",
    "direction": "sendonly",
    "iceUfrag": "",
    "icePwd": "",
    "candidates": [],
    "endOfCandidates": "end-of-candidates",
    "iceOptions": "renomination",
    "ssrcs": [],
    "ssrcGroups": [],
    "rtcpMux": "rtcp-mux",
    "rtcpRsize": "rtcp-rsize"
  }

  const inactiveVideoTemplate = {
    "rtp": [
      {
        "payload": 101,
        "codec": "VP8",
        "rate": 90000
      },
      {
        "payload": 102,
        "codec": "rtx",
        "rate": 90000
      }
    ],
    "fmtp": [
      {
        "payload": 102,
        "config": "apt=101"
      }
    ],
    "type": "video",
    "port": 7,
    "protocol": "UDP/TLS/RTP/SAVPF",
    "payloads": "101 102",
    "connection": {
      "version": 4,
      "ip": "127.0.0.1"
    },
    "rtcpFb": [
      {
        "payload": 101,
        "type": "transport-cc",
        "subtype": ""
      },
      {
        "payload": 101,
        "type": "ccm",
        "subtype": "fir"
      },
      {
        "payload": 101,
        "type": "nack",
        "subtype": ""
      },
      {
        "payload": 101,
        "type": "nack",
        "subtype": "pli"
      }
    ],
    "setup": "actpass",
    "mid": 1,
    "msid": "",
    "direction": "inactive",
    "iceUfrag": "",
    "icePwd": "",
    "candidates": [],
    "endOfCandidates": "end-of-candidates",
    "iceOptions": "renomination",
    "ssrcs": [],
    "ssrcGroups": [],
    "rtcpMux": "rtcp-mux",
    "rtcpRsize": "rtcp-rsize"
  }

  const remoteSdpObj = Object.assign({}, sdpTemplate);

  remoteSdpObj.fingerprint = {
    "type": remoteDTLSParameters.fingerprint.algorithm,
    "hash": remoteDTLSParameters.fingerprint.value
  }

  let medias = [];

  let mids = [];
  for (let [key, receiver] of receivers) {
    // console.log(receiver);
    if (receiver.kind === 'audio') {
      let media;

      if (receiver.active) {
        media = Object.assign({}, audioTemplate);
      } else {
        media = Object.assign({}, inactiveAudioTemplate);
      }

      media.mid = String(receiver.mid);
      media.msid = `${receiver.receiverId} ${receiver.rtpParameters.rtcp.cname}`
      media.iceUfrag = remoteICEParameters.usernameFragment;
      media.icePwd = remoteICEParameters.password;

      for (let i in remoteICECandidates) {
        let candidate = remoteICECandidates[i];
        media.candidates.push(Object.assign(candidate, { component: 1, transport: candidate.protocol }))
      }

      media.ssrcs = [
        {
          "id": receiver.rtpParameters.encodings[0].ssrc,
          "attribute": "cname",
          "value": receiver.rtpParameters.rtcp.cname
        }
      ]
      medias.push(media);
    } else if (receiver.kind == 'video') {

      let media;
      if (receiver.active) {
        media = Object.assign({}, videoTemplate);
      } else {
        media = Object.assign({}, inactiveVideoTemplate);

      }
      console.log(receiver.mid);
      media.mid = String(receiver.mid);
      media.msid = `${receiver.receiverId} ${receiver.rtpParameters.rtcp.cname}`
      media.iceUfrag = remoteICEParameters.usernameFragment;
      media.icePwd = remoteICEParameters.password;

      for (let i in remoteICECandidates) {
        let candidate = remoteICECandidates[i];
        media.candidates.push(Object.assign(candidate, { component: 1, transport: candidate.protocol }))
      }

      media.ssrcs = [
        {
          "id": receiver.rtpParameters.encodings[0].ssrc,
          "attribute": "cname",
          "value": receiver.rtpParameters.rtcp.cname
        }
      ]
      medias.push(media);
    }

    mids.push(receiver.mid);
  }


  remoteSdpObj.media = medias;

  remoteSdpObj.groups = [
    {
      "type": "BUNDLE",
      "mids": mids.join(" ")
    }
  ]

  let remoteSdp = sdpTransform.write(remoteSdpObj);

  console.log(remoteSdp);

  return remoteSdp;
}

export default class Subscriber extends Transport {
  constructor(id, remoteICECandidates, remoteICEParameters, remoteDTLSParameters) {
    super(id, remoteICECandidates, remoteICEParameters, remoteDTLSParameters);

    this.receivers = new Map();

    this.asyncQueue = new AsyncQueue();

    this.state = Transport.TRANSPORT_NEW;

    this.isGotDtls = false;

    this.currentMid = 0;

  }

  addReceiver(senderId, tokenId, receiverId, kind, rtpParameters, metadata) {
    const receiver = new Receiver(senderId, tokenId, receiverId, kind, rtpParameters, metadata);
    receiver.mid = String(this.currentMid++);
    this.receivers.set(senderId, receiver);
    return receiver;
  }

  receive(receiver) {
    this.asyncQueue.push(this, this._receive, receiver);
  }

  async _receive(receiver) {
    if (!receiver.active) {
      receiver.active = true;
    }

    let remoteSdp = remoteSdpGenerator(this.receivers, this.remoteICECandidates,
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
    this.ontrack(transceiver.receiver.track,receiver);

    //TODO: consumer resume

    if (!this.isGotDtls) {
      this.isGotDtls = true;
      //dtls
      let answerSdpObj = sdpTransform.parse(answer.sdp);
      let dtls = getDtls(answerSdpObj);
      const dtlsParameters =
      {
        role: 'client',
        fingerprints:
          [
            {
              algorithm: dtls.type,
              value: dtls.hash
            }
          ]
      };

      this.ondtls(dtlsParameters);
    }

  }

  removeReceiver(receiver) {
    this.asyncQueue.push(this, this._removeReceiver, receiver);
  }

  async _removeReceiver(receiver) {
    receiver.active = false;

    let remoteSdp = remoteSdpGenerator(this.receivers, this.remoteICECandidates,
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

