import sdpTransform from 'sdp-transform';

export function randomInitId(length) {
  let randomNum = 0;
  while (randomNum < 0.1) {
    randomNum = Math.random();
  }
  return parseInt(randomNum * Math.pow(10, length))
}

class TrackSdp {
  constructor(codec, payloads, type, direction) {
    this.codec = codec;
    this.payloads = payloads;

    this.type = type;

    this.direction = direction;
  }

  generate(isActive, mid, setup, iceUfrag, icePwd, candidates) {
    const template = {};

    //audio
    const audioRtp = [
      {
        "payload": 111,
        "codec": "opus",
        "rate": 48000,
        "encoding": 2
      }
    ];

    const audioFtmp = [
      {
        "payload": 111,
        "config": "stereo=1;usedtx=1"
      }

    ]

    const audioRtcpFb = [
      {
        "payload": 111,
        "type": "transport-cc",
        "subtype": ""
      }
    ];

    const audioExt = [
      {
        "value": 4,
        "uri": "urn:ietf:params:rtp-hdrext:sdes:mid"
      },
      {
        "value": 2,
        "uri": "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time"
      },
      {
        "value": 3,
        "uri": "http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01"
      },
      {
        "value": 1,
        "uri": "urn:ietf:params:rtp-hdrext:ssrc-audio-level"
      }
    ];

    //video
    const videoRtp = [
      {
        "payload": 96,
        "codec": "VP8",
        "rate": 90000
      },
      {
        "payload": 97,
        "codec": "rtx",
        "rate": 90000
      }
    ]

    const videoFmtp = [
      {
        "payload": 96,
        "config": "x-google-start-bitrate=1000"
      },
      {
        "payload": 97,
        "config": "apt=96"
      }
    ]

    const videoRtcpFb = [
      {
        "payload": 96,
        "type": "transport-cc",
        "subtype": ""
      },
      {
        "payload": 96,
        "type": "ccm",
        "subtype": "fir"
      },
      {
        "payload": 96,
        "type": "nack",
        "subtype": ""
      },
      {
        "payload": 96,
        "type": "nack",
        "subtype": "pli"
      }
    ]

    const videoExt = [
      {
        "value": 4,
        "uri": "urn:ietf:params:rtp-hdrext:sdes:mid"
      },
      {
        "value": 5,
        "uri": "urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id"
      },
      {
        "value": 6,
        "uri": "urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id"
      },
      {
        "value": 2,
        "uri": "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time"
      },
      {
        "value": 3,
        "uri": "http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01"
      },
      {
        "value": 8,
        "uri": "http://tools.ietf.org/html/draft-ietf-avtext-framemarking-07"
      },
      {
        "value": 13,
        "uri": "urn:3gpp:video-orientation"
      },
      {
        "value": 14,
        "uri": "urn:ietf:params:rtp-hdrext:toffset"
      }
    ]

    let ext;
    if (this.type === 'audio') {
      template['rtp'] = audioRtp;
      template['fmtp'] = audioFtmp;
      template['rtcpFb'] = audioRtcpFb;
      ext = audioExt;
    } else if (this.type === 'video') {
      template['rtp'] = videoRtp;
      template['fmtp'] = videoFmtp;
      template['rtcpFb'] = videoRtcpFb;
      ext = videoExt;
    }

    if (isActive) {
      template['direction'] = this.direction;
      template['ext'] = ext;
      template['port'] = 7;

    } else {
      if (mid != '0') {
        template['port'] = 0;
      } else {
        template['port'] = 7;
      }
      template['direction'] = 'inactive';
    }


    //static
    template['protocol'] = "UDP/TLS/RTP/SAVPF";
    template['connection'] = {
      "version": 4,
      "ip": "127.0.0.1"
    };
    template["endOfCandidates"] = 'end-of-candidates';
    template["iceOptions"] = "renomination";
    template["rtcpMux"] = "rtcp-mux";
    template["rtcpRsize"] = "rtcp-rsize";

    //dynamic
    template['type'] = this.type;
    template['payloads'] = this.payloads

    //instant
    template['setup'] = setup;
    template['mid'] = mid;
    template["iceUfrag"] = iceUfrag;
    template["icePwd"] = icePwd;
    template["candidates"] = candidates;

    return template;
  }
}


export function pubRemoteSdpGen(senders, remoteICECandidates, remoteICEParameters, remoteDTLSParameters) {
  const sdpTemplate = {
    "version": 0,
    "origin": {
      "username": "xxx",
      "sessionId": 10000,
      "sessionVersion": 2,
      "netType": "IN",
      "ipVer": 4,
      "address": "0.0.0.0"
    },
    "name": "-",
    "timing": {
      "start": 0,
      "stop": 0
    },
    "msidSemantic": {
      "semantic": "WMS",
      "token": "*"
    },
    "icelite": "ice-lite",//FIXME: 
    "groups": [],//BUNDLE
    "media": [], //medias
    "fingerprint": {},
  }

  let remoteSdpObj = Object.assign({}, sdpTemplate);

  const fingerprint = {
    "type": remoteDTLSParameters.fingerprint.algorithm,
    "hash": remoteDTLSParameters.fingerprint.value
  };

  remoteSdpObj.fingerprint = fingerprint;


  let medias = [];
  let mids = [];
  for (let sender of senders) {
    // console.log(videoTemplate);
    if (!sender.isStopped || sender.mid === '0') {
      let trackSdp;
      if (sender.kind === 'audio') {
        trackSdp = new TrackSdp('opus', 111, 'audio', 'recvonly');
        if (sender.available) {
          mids.push(sender.mid);
        } else {
          if (sender.mid === '0') {
            mids.push(sender.mid);
          }
        }

      } else if (sender.kind === 'video') {
        trackSdp = new TrackSdp('vp8', '96 97', 'video', 'recvonly');

        if (sender.available) {
          mids.push(sender.mid);
        } else {
          if (sender.mid === '0') {
            mids.push(sender.mid);
          }
        }
      } else {
        //todo
      }



      let media = trackSdp.generate(sender.available, sender.mid, remoteDTLSParameters.setup, remoteICEParameters.usernameFragment,
        remoteICEParameters.password, remoteICECandidates);
      medias.push(media);
    }
  }

  //todo fix
  remoteSdpObj.groups = [
    {
      "type": "BUNDLE",
      "mids": mids.join(" ")
    }
  ]

  remoteSdpObj.media = medias;

  let remoteSdp = new RTCSessionDescription({
    type: 'answer',
    sdp: sdpTransform.write(remoteSdpObj)
  });

  return remoteSdp;
}

//TODO: dtx ssrc, group ssrc
export function subRemoteSdpGen(receivers, remoteICECandidates, remoteICEParameters, remoteDTLSParameters) {

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

  const audioExt = [
    {
      "value": 1,
      "uri": "urn:ietf:params:rtp-hdrext:sdes:mid"
    },

    {
      "value": 4,
      "uri": "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time"
    },
    {
      "value": 10,
      "uri": "urn:ietf:params:rtp-hdrext:ssrc-audio-level"
    }
  ];

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
    "setup": "actpass",
    "mid": 0,
    "msid": "",
    "direction": "",
    "iceUfrag": "",
    "icePwd": "",
    "candidates": [],
    "endOfCandidates": "end-of-candidates",
    "iceOptions": "renomination",
    "ssrcs": [],
    "rtcpMux": "rtcp-mux",
    "rtcpRsize": "rtcp-rsize"
  }

  const videoExt = [
    {
      "value": 1,
      "uri": "urn:ietf:params:rtp-hdrext:sdes:mid"
    },
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
  ];

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
    "setup": "actpass",
    "mid": 1,
    "msid": "",
    "direction": "",
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
    let media;
    if (receiver.kind === 'audio') {

      media = Object.assign({}, audioTemplate);
      if (receiver.active) {
        media.direction = 'sendonly';
        media.ext = audioExt;
      } else {
        media.direction = 'inactive';
      }

    } else if (receiver.kind == 'video') {

      media = Object.assign({}, videoTemplate);

      if (receiver.active) {
        media.direction = 'sendonly';
        media.ext = videoExt;
      } else {
        media.direction = 'inactive';
      }
    }


    media.mid = String(receiver.mid);
    media.msid = `${receiver.rtpParameters.rtcp.cname} ${receiver.receiverId}`
    media.iceUfrag = remoteICEParameters.usernameFragment;
    media.icePwd = remoteICEParameters.password;

    media.candidates = remoteICECandidates;

    media.ssrcs = [
      {
        "id": receiver.rtpParameters.encodings[0].ssrc,
        "attribute": "cname",
        "value": receiver.rtpParameters.rtcp.cname
      }
    ]

    if (receiver.kind === 'video') {
      media.ssrcs.push({
        "id": receiver.rtpParameters.encodings[0].rtx.ssrc,
        "attribute": "cname",
        "value": receiver.rtpParameters.rtcp.cname
      })

      media.ssrcGroups = [
        {
          "semantics": "FID",
          "ssrcs": `${receiver.rtpParameters.encodings[0].ssrc} ${receiver.rtpParameters.encodings[0].rtx.ssrc}`
        }
      ]
    }

    medias.push(media);

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
  return remoteSdp;
}

//TODO: get setup
export function getDtls(localSdpObj) {
  // console.log(JSON.stringify(localSdpObj));
  for (let media of localSdpObj.media) {
    if (media.fingerprint) {
      const dtlsParameters =
      {
        setup: 'active',
        fingerprint: {
          algorithm: media.fingerprint.type,
          value: media.fingerprint.hash
        }
      };

      return dtlsParameters
    }
  }
}
