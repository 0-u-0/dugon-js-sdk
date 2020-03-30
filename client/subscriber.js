import AsyncQueue from './asyncQueue';
import Transport from './transport';

import { getDtls } from './utils';

import sdpTransform from 'sdp-transform';

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

  const remoteSdpObj = Object.assign({}, sdpTemplate);

  remoteSdpObj.fingerprint = {
    "type": remoteDTLSParameters.fingerprint.algorithm,
    "hash": remoteDTLSParameters.fingerprint.value
  }

  let medias = [];

  for (let [key, receiver] of receivers) {
    if (receiver.kind === 'audio') {
      let media = Object.assign({}, audioTemplate);
      console.log(receiver.mid);
      media.mid = String(receiver.mid);
      media.msid = `${receiver.consumerId} ${receiver.rtpParameters.rtcp.cname}`
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

    }
  }


  remoteSdpObj.media = medias;

  let remoteSdp = sdpTransform.write(remoteSdpObj);

  console.log(remoteSdp);

  return remoteSdp;
}

class Receiver {
  constructor(producerId, tokenId, metadata) {
    this.producerId = producerId;
    this.tokenId = tokenId;
    this.metadata = metadata;

    this.consumerId = null;

    this.active = false;
  }
}

export default class Subscriber extends Transport {
  constructor() {
    super();
    this.id = null;
    this.pc = null;

    this.receivers = new Map();

    this.asyncQueue = new AsyncQueue();

    this.state = Transport.TRANSPORT_NEW;

    this.currentMid = 0;

  }

  addReceiver(producerId, tokenId, metadata) {
    const receiver = new Receiver(producerId, tokenId, metadata);
    receiver.mid = String(this.currentMid++);
    this.receivers.set(producerId, receiver);
    return receiver;
  }

  async init() {
    this.pc = new RTCPeerConnection();

    let remoteSdp = remoteSdpGenerator(this.receivers, this.remoteICECandidates,
      this.remoteICEParameters, this.remoteDTLSParameters);

    await this.pc.setRemoteDescription(new RTCSessionDescription({
      type: 'offer',
      sdp: remoteSdp
    }))
    let answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    //dtls
    let dtls = getDtls(answer.sdp);
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

    console.log(dtlsParameters);
    this.ondtls(dtlsParameters);

    //track
    for (let [key, receiver] of this.receivers) {
      if (receiver.active) {
        const transceiver = await this.pc.getTransceivers().find(t => t.mid === receiver.mid);
        receiver.transceiver = transceiver;
        this.ontrack(transceiver.receiver.track);
      }
    }

  }
}

