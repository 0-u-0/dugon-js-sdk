import sdpTransform from 'sdp-transform';

export function randomInitId(length) {
  let randomNum = 0;
  while (randomNum < 0.1) {
    randomNum = Math.random();
  }
  return parseInt(randomNum * Math.pow(10, length))
}

export function initCanvas() {
  canvas = document.createElement("canvas")
  var context = canvas.getContext('2d');

  document.body.append(canvas);

  var clickX = new Array();
  var clickY = new Array();
  var clickDrag = new Array();
  var paint;

  function addClick(x, y, dragging) {
    clickX.push(x);
    clickY.push(y);
    clickDrag.push(dragging);
  }

  canvas.setAttribute("width", 300);
  canvas.setAttribute("height", 300);
  canvas.style.backgroundColor = "pink"

  canvas.onmousedown = function (e) {
    var mouseX = e.pageX - this.offsetLeft;
    var mouseY = e.pageY - this.offsetTop;

    paint = true;
    addClick(e.pageX - this.offsetLeft, e.pageY - this.offsetTop);
    redraw();
  };

  canvas.onmousemove = function (e) {
    if (paint) {
      addClick(e.pageX - this.offsetLeft, e.pageY - this.offsetTop, true);
      redraw();
    }
  };
  canvas.onmouseup = function (e) {
    paint = false;
  };

  canvas.onmouseleave = function (e) {
    paint = false;
  };

  function redraw() {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height); // Clears the canvas

    context.strokeStyle = "#df4b26";
    context.lineJoin = "round";
    context.lineWidth = 5;

    for (var i = 0; i < clickX.length; i++) {
      context.beginPath();
      if (clickDrag[i] && i) {
        context.moveTo(clickX[i - 1], clickY[i - 1]);
      } else {
        context.moveTo(clickX[i] - 1, clickY[i]);
      }
      context.lineTo(clickX[i], clickY[i]);
      context.closePath();
      context.stroke();
    }
  }

  // var ctx = canvas[0].getContext("2d");
  // ctx.fillStyle = "green";
  // draw(ctx);
}

export function remoteSdpGen(senders, remoteICECandidates, remoteICEParameters, remoteDTLSParameters) {
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
    "icelite": "ice-lite",
    "fingerprint": {},
    "msidSemantic": {
      "semantic": "WMS",
      "token": "*"
    },
    "groups": [],
    "media": []
  }

  const audioTemplate = {
    "rtp": [
      {
        "payload": 111,
        "codec": "opus",
        "rate": 48000,
        "encoding": 2
      }
    ],
    "fmtp": [
      {
        "payload": 111,
        "config": "stereo=1;usedtx=1"
      }
    ],
    "type": "audio",
    "port": 7,
    "protocol": "UDP/TLS/RTP/SAVPF",
    "payloads": 111,
    "connection": {
      "version": 4,
      "ip": "127.0.0.1"
    },
    "rtcpFb": [
      {
        "payload": 111,
        "type": "transport-cc",
        "subtype": ""
      }
    ],
    "ext": [
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
    ],
    "setup": "",
    "mid": 0,
    "direction": "recvonly",
    "iceUfrag": "",
    "icePwd": "",
    "candidates": [
    ],
    "endOfCandidates": "end-of-candidates",
    "iceOptions": "renomination",
    "rtcpMux": "rtcp-mux",
    "rtcpRsize": "rtcp-rsize"
  }

  const videoTemplate = {
    "rtp": [
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
    ],
    "fmtp": [
      {
        "payload": 96,
        "config": "x-google-start-bitrate=1000"
      },
      {
        "payload": 97,
        "config": "apt=96"
      }
    ],
    "type": "video",
    "port": 7,
    "protocol": "UDP/TLS/RTP/SAVPF",
    "payloads": "96 97",
    "connection": {
      "version": 4,
      "ip": "127.0.0.1"
    },
    "rtcpFb": [
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
    ],
    "ext": [
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
    ],
    "setup": "",
    "mid": 1,
    "direction": "recvonly",
    "iceUfrag": "",
    "icePwd": "",
    "candidates": [],
    "endOfCandidates": "end-of-candidates",
    "iceOptions": "renomination",
    "rtcpMux": "rtcp-mux",
    "rtcpRsize": "rtcp-rsize"
  }

  const inactiveAudioTemplate = {
    "rtp": [
      {
        "payload": 111,
        "codec": "opus",
        "rate": 48000,
        "encoding": 2
      }
    ],
    "fmtp": [
      {
        "payload": 111,
        "config": "stereo=1;usedtx=1"
      }
    ],
    "type": "audio",
    "port": 7,
    "protocol": "UDP/TLS/RTP/SAVPF",
    "payloads": 111,
    "connection": {
      "version": 4,
      "ip": "127.0.0.1"
    },
    "rtcpFb": [
      {
        "payload": 111,
        "type": "transport-cc",
        "subtype": ""
      }
    ],
    "setup": "",
    "mid": 0,
    "direction": "inactive",
    "iceUfrag": "",
    "icePwd": "",
    "candidates": [
    ],
    "endOfCandidates": "end-of-candidates",
    "iceOptions": "renomination",
    "rtcpMux": "rtcp-mux",
    "rtcpRsize": "rtcp-rsize"
  }

  const inactiveVideoTemplate = {
    "rtp": [
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
    ],
    "fmtp": [
      {
        "payload": 96,
        "config": "x-google-start-bitrate=1000"
      },
      {
        "payload": 97,
        "config": "apt=96"
      }
    ],
    "type": "video",
    "port": 0,
    "protocol": "UDP/TLS/RTP/SAVPF",
    "payloads": "96 97",
    "connection": {
      "version": 4,
      "ip": "127.0.0.1"
    },
    "rtcpFb": [
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
    ],
    "setup": "active",
    "mid": 1,
    "direction": "inactive",
    "iceUfrag": "",
    "icePwd": "",
    "candidates": [],
    "endOfCandidates": "end-of-candidates",
    "iceOptions": "renomination",
    "rtcpMux": "rtcp-mux",
    "rtcpRsize": "rtcp-rsize"
  }

  let remoteSdpObj = Object.assign(sdpTemplate);

  remoteSdpObj.fingerprint = {
    "type": remoteDTLSParameters.fingerprint.algorithm,
    "hash": remoteDTLSParameters.fingerprint.value
  }


  // let localSdpObj = Soup.sdpTransform.parse(localSdp);
  // console.log(localSdpObj.media.length)
  let medias = [];
  let mids = [];
  for (let sender of senders) {
    // console.log(videoTemplate);

    if (!sender.isStopped || sender.mid === '0') {
      let mediaObj;
      if (sender.kind === 'audio') {
        if (sender.available) {
          mediaObj = Object.assign({}, JSON.parse(JSON.stringify(audioTemplate)));
          mids.push(sender.mid);
        } else {
          mediaObj = Object.assign({}, JSON.parse(JSON.stringify(inactiveAudioTemplate)));
          if (sender.mid === '0') {
            mids.push(sender.mid);
          }
        }

      } else if (sender.kind === 'video') {
        if (sender.available) {
          mediaObj = Object.assign({}, JSON.parse(JSON.stringify(videoTemplate)));
          mids.push(sender.mid);
        } else {
          mediaObj = Object.assign({}, JSON.parse(JSON.stringify(inactiveVideoTemplate)));
          if (sender.mid === '0') {
            mids.push(sender.mid);
          }
        }
      } else {
        //todo
      }


      if (remoteDTLSParameters.role === 'server') {
        mediaObj.setup = 'passive'
      } else if (remoteDTLSParameters.role === 'client') {
        mediaObj.setup = 'active'
      }

      mediaObj.iceUfrag = remoteICEParameters.usernameFragment;
      mediaObj.icePwd = remoteICEParameters.password;

      for (let i in remoteICECandidates) {
        let candidate = remoteICECandidates[i];
        mediaObj.candidates.push(Object.assign(candidate, { component: 1, transport: candidate.protocol }))
      }

      mediaObj.mid = sender.mid;

      // console.log(mediaObj.mid);
      medias.push(mediaObj);
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

export function getDtls(localSdpObj) {
  // console.log(JSON.stringify(localSdpObj));
  for (let media of localSdpObj.media) {
    if (media.fingerprint) {
      return media.fingerprint
    }
  }
}

export function getProduceData(sender) {
  let producingData;
  if (sender.kind === 'audio') {
    const sendingRtpParameters = {
      "codecs": [
        {
          "mimeType": "audio/opus",
          "payloadType": 111,
          "clockRate": 48000,
          "channels": 2,
          "parameters": {
            "minptime": 10,
            "useinbandfec": 1,
            "sprop-stereo": 1,
            "usedtx": 1
          },
          "rtcpFeedback": [
            {
              "type": "transport-cc",
              "parameter": ""
            }
          ]
        }
      ],
      "headerExtensions": [
        {
          "uri": "urn:ietf:params:rtp-hdrext:sdes:mid",
          "id": 4,
          "encrypt": false,
          "parameters": {}
        },
        {
          "uri": "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time",
          "id": 2,
          "encrypt": false,
          "parameters": {}
        },
        {
          "uri": "http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
          "id": 3,
          "encrypt": false,
          "parameters": {}
        },
        {
          "uri": "urn:ietf:params:rtp-hdrext:ssrc-audio-level",
          "id": 1,
          "encrypt": false,
          "parameters": {}
        }
      ],
      "mid": sender.mid,
      "rtcp":
      {
        "reducedSize": true
      }
    };

    const ssrc = sender.ssrcs[0].id;
    let cname = null;
    for (let s of sender.ssrcs) {
      if (s.attribute == 'cname') {
        cname = s.value;
        break;
      }
    }

    sendingRtpParameters.rtcp.cname = cname;
    sendingRtpParameters.encodings = [
      {
        "ssrc": ssrc,
        "dtx": false
      }
    ];

    // console.log(sendingRtpParameters);
    producingData = {
      "kind": "audio",
      "rtpParameters": sendingRtpParameters,
    }
  } else if (sender.kind === 'video') {
    const sendingRtpParameters = {
      "codecs": [
        {
          "mimeType": "video/VP8",
          "payloadType": 96,
          "clockRate": 90000,
          "channels": 1,
          "parameters": {},
          "rtcpFeedback": [
            {
              "type": "goog-remb",
              "parameter": ""
            },
            {
              "type": "transport-cc",
              "parameter": ""
            },
            {
              "type": "ccm",
              "parameter": "fir"
            },
            {
              "type": "nack",
              "parameter": ""
            },
            {
              "type": "nack",
              "parameter": "pli"
            }
          ]
        },
        {
          "mimeType": "video/rtx",
          "payloadType": 97,
          "clockRate": 90000,
          "channels": 1,
          "parameters": {
            "apt": 96
          },
          "rtcpFeedback": []
        }
      ],
      "headerExtensions": [
        {
          "uri": "urn:ietf:params:rtp-hdrext:sdes:mid",
          "id": 4,
          "encrypt": false,
          "parameters": {}
        },
        {
          "uri": "urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id",
          "id": 5,
          "encrypt": false,
          "parameters": {}
        },
        {
          "uri": "urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id",
          "id": 6,
          "encrypt": false,
          "parameters": {}
        },
        {
          "uri": "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time",
          "id": 2,
          "encrypt": false,
          "parameters": {}
        },
        {
          "uri": "http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
          "id": 3,
          "encrypt": false,
          "parameters": {}
        },
        {
          "uri": "http://tools.ietf.org/html/draft-ietf-avtext-framemarking-07",
          "id": 8,
          "encrypt": false,
          "parameters": {}
        },
        {
          "uri": "urn:3gpp:video-orientation",
          "id": 13,
          "encrypt": false,
          "parameters": {}
        },
        {
          "uri": "urn:ietf:params:rtp-hdrext:toffset",
          "id": 14,
          "encrypt": false,
          "parameters": {}
        }
      ],

      "rtcp": {
        "reducedSize": true
      },
      "mid": sender.mid
    };

    let encodings;

    if (sender.ssrcGroups != undefined) {

      encodings = [
        {
          "ssrc": sender.ssrcs[0].id,
          "rtx": {
            "ssrc": sender.ssrcs[4].id
          },
          "dtx": false
        }
      ]
    } else {
      encodings = [
        {
          "ssrc": sender.ssrcs[0].id,
          "dtx": false
        }
      ]
    }

    let cname = null;
    for (let s of sender.ssrcs) {
      if (s.attribute == 'cname') {
        cname = s.value;
        break;
      }
    }

    sendingRtpParameters.rtcp.cname = cname;
    sendingRtpParameters.encodings = encodings;

    // console.log(sendingRtpParameters);
    producingData = {
      "kind": "video",
      "rtpParameters": sendingRtpParameters,
    }
  }
  producingData.localId = sender.id;
  return producingData;
}