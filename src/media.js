
const H264_BASELINE = '42001f';
const H264_CONSTRAINED_BASELINE = '42e01f'
const H264_MAIN = '4d0032'
const H264_HIGH = '640032'

function objToStr(obj) {
  let arr = [];
  for (let k in obj) {
    arr.push(`${k}=${obj[k]}`)
  }
  return arr.join(';')
}

export default class Media {
  static createMedia(mid, direction, codecCap, sdp) {
    //codecCap, ext should be merged
    let media;
    for (let m of sdp.media) {
      if (m.mid == mid) {
        media = m;
        break;
      }
    }
    if (media) {
      let codec, payload, rate, channels,
        fmtp, rtx, cname;

      let rtcpFb = [];
      let extension = [];

      //TODO: h264
      // H264_BASELINE,H264_CONSTRAINED_BASELINE,H264_MAIN,H264_HIGH
      if (codecCap.codecName.slice(0, 4) == 'H264') {
        codec = 'H264';

        for (let f of media.fmtp) {
          let matched = true;
          for (let p of codecCap.parameters) {
            if (!f.config.includes(p)) {
              matched = false;
            }
          }
          if (matched) {
            payload = f.payload;
            fmtp = f.config;
          }

          if (f.config == `apt=${payload}`) {
            rtx = f.payload;
          }
        }

        for (let rtp of media.rtp) {
          if (rtp.payload == payload) {
            rate = rtp.rate;
            channels = rtp.encoding;
          }
        }

      } else {
        codec = codecCap.codecName;

        for (let rtp of media.rtp) {
          if (rtp.codec == codec) {
            payload = rtp.payload;
            rate = rtp.rate;
            channels = rtp.encoding;
          }
        }

        for (let f of media.fmtp) {
          if (f.payload == payload) {
            fmtp = f.config;
          }
          if (f.config == `apt=${payload}`) {
            rtx = f.payload;
          }
        }
      }

      for (let s of media.ssrcs) {
        if (s.attribute == 'cname') {
          cname = s.value;
          break;
        }
      }

      //codecCap, rtcpFb should be merged
      /**
       //TODO:  use transport-cc as default , extension
       */
      for (let tf of media.rtcpFb) {
        if (tf.payload == payload && tf.type != 'goog-remb') {
          let parameter = tf.subtype ? tf.subtype : ""
          for (let tfCap of codecCap.rtcpFeedback) {
            if (tfCap.type == tf.type && tfCap.parameter == parameter) {
              rtcpFb.push({
                type: tf.type,
                parameter
              });
              break;
            }
          }
        }
      }

      //codecCap, ext should be merged
      let avaiableExt = codecCap.ext.filter(ext => ext[direction]);

      for (let e of media.ext) {
        for (let ae of avaiableExt) {
          if (e.uri == ae.uri) {
            let newExt = {
              'id': e.value,
              'uri': e.uri,
              'encrypt': false,
              'parameters': {}
            }
            extension.push(newExt);
            break;
          }
        }
      }


      return new Media(media.type, direction, codec, payload, rate, mid, cname, channels,
        fmtp, media.ssrcs, media.ssrcGroups, rtcpFb, extension, rtx, media.protocol);

    }

    return null;
  }

  //TODO: dtx
  constructor(type, direction, codec, payload, rate, mid, cname,
    channels = 1, parameters, ssrc, ssrcGroups,
    rtcpFb, extension, rtx, protocol) {
    this.type = type;
    this.direction = direction;
    this.codec = codec;
    this.rate = rate;
    this.channels = channels;

    if (parameters) {
      let p1 = parameters.split(';')
      let np = {};
      for (let l of p1) {
        let r = l.split('=');
        let key = r[0];
        let value = r[1];
        if (!isNaN(r[1])) {
          value = parseInt(value)
        }
        np[key] = value
      }
      this.parameters = np;
    } else {
      this.parameters = {};
    }
    this.payload = payload;
    this.ssrc = ssrc;
    this.ssrcGroups = ssrcGroups;

    this.rtcpFb = rtcpFb;
    this.extension = extension;
    this.mid = mid;
    this.cname = cname;
    this.reducedSize = true;

    this.protocol = protocol;

    this.rtx = rtx;
  }


  toRtpParameters() {

    const headerExtensions = this.extension;
    const rtcp = {
      "reducedSize": true,
      "cname": this.cname
    }
    const mid = this.mid;

    const codecs = [
      {
        "mimeType": `${this.type}/${this.codec}`,
        "payloadType": this.payload,
        "clockRate": this.rate,
        "channels": this.channels,
        "parameters": this.parameters,
        "rtcpFeedback": this.rtcpFb
      }
    ];

    const encodings = [
      {
        "ssrc": this.ssrc[0].id,
        //TODO: 
        "dtx": false
      }
    ]

    if ('video' == this.type && this.rtx) {
      codecs.push({
        "mimeType": `video/rtx`,
        "payloadType": this.rtx,
        "clockRate": this.rate,
        "channels": this.channels,
        "parameters": {
          "apt": this.payload
        },
        "rtcpFeedback": []
      })
      //TODO: get id from ssrc group
      encodings[0]["rtx"] = {
        "ssrc": this.ssrc[4].id
      };
    }

    return {
      "kind": this.type,
      "rtpParameters": {
        codecs, headerExtensions, rtcp, mid, encodings
      },
    };
  }

  toSdp(iceParameters, candidates, isActive) {
    let lines = [];
    //var
    let port = 0;
    if (isActive || this.mid == '0') {
      port = 7;
    }

    let direction = `${this.direction}only`;
    if (!isActive) {
      direction = 'inactive';
    }

    let mLine = `m=${this.type} ${port} ${this.protocol} ${this.payload}`;
    if(this.rtx){
      mLine = mLine + ' ' + this.rtx;
    }

    //
    lines.push(mLine);
    lines.push(`c=IN IP4 127.0.0.1`);
    if (this.channels == 1) {
      lines.push(`a=rtpmap:${this.payload} ${this.codec}/${this.rate}`);
    } else {
      lines.push(`a=rtpmap:${this.payload} ${this.codec}/${this.rate}/${this.channels}`);
    }

    if (this.rtx) {
      lines.push(`a=rtpmap:${this.rtx} rtx/${this.rate}`);
    }

    if (Object.keys(this.parameters).length > 0) {
      lines.push(`a=fmtp:${this.payload} ${objToStr(this.parameters)}`);
    }

    if (this.rtx) {
      lines.push(`a=fmtp:${this.rtx} apt=${this.payload}`);
    }

    //rtcp-feedback
    for (let rf of this.rtcpFb) {
      let str = `${rf.type} ${rf.parameter}`.trim();
      lines.push(`a=rtcp-fb:${this.payload} ${str}`);
    }

    //extension
    if (isActive) {
      for (let e of this.extension) {
        lines.push(`a=extmap:${e.id} ${e.uri}`);
      }
    }

    //TODO: SSl role
    lines.push(`a=setup:passive`);
    lines.push(`a=mid:${this.mid}`);
    lines.push(`a=${direction}`);

    //ice 
    lines.push(`a=ice-ufrag:${iceParameters.usernameFragment}`);
    lines.push(`a=ice-pwd:${iceParameters.password}`);

    //candiate
    for (let c of candidates) {
      lines.push(`a=candidate:${c.foundation} ${c.component} ${c.transport} ${c.priority} ${c.ip} ${c.port} typ ${c.type}`);
    }

    lines.push(`a=end-of-candidates`);

    //TODO:
    lines.push(`a=ice-options:renomination`);

    lines.push(`a=rtcp-mux`);
    lines.push(`a=rtcp-rsize`);

    return lines.join('\r\n');
  }



}