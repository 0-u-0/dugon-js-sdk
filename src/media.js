
const H264_BASELINE = '42001f';
const H264_CONSTRAINED_BASELINE = '42e01f'
const H264_MAIN = '4d0032'
const H264_HIGH = '640032'

class RTX {
  constructor(payload, rate, channels) {
    this.payload = payload;
    this.rate = rate;
    this.channels = channels;
  }
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

      let rtcpMux = false, rtcpRsize = false;

      let rtcpFb = [];
      let extension = [];

      //TODO: h264
      // H264_BASELINE,H264_CONSTRAINED_BASELINE,H264_MAIN,H264_HIGH
      if (codecCap.codecName.slice(0, 4) == 'H264') {
        // let profile;
        // if (codecCap.codecName.slice(5) == 'BASELINE') {
        //   profile = H264_BASELINE;
        // } else if (codecCap.codecName.slice(5) == 'CONSTRAINED-BASELINE') {
        //   profile = H264_CONSTRAINED_BASELINE;
        // } else if (codecCap.codecName.slice(5) == 'MAIN') {
        //   profile = H264_MAIN;
        // } else if (codecCap.codecName.slice(5) == 'HIGH') {
        //   profile = H264_HIGH;
        // }
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

      for (let tf of media.rtcpFb) {
        if (tf.payload == payload) {
          let parameter = tf.parameter ? tf.parameter : ""
          rtcpFb.push({
            type: tf.type,
            parameter
          });

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

      if (media.rtcpRsize) {
        rtcpRsize = true;
      }
      if (media.rtcpMux) {
        rtcpMux = true;
      }

      return new Media(media.type, codec, payload, rate, mid, cname, channels,
        fmtp, media.ssrcs, media.ssrcGroups, rtcpFb, extension, rtx, rtcpMux, rtcpRsize);

    }

    return null;
  }

  //TODO: dtx
  constructor(type, codec, payload, rate, mid, cname,
    channels = 1, parameters, ssrc, ssrcGroups,
    rtcpFb, extension, rtx, rtcpMux, rtcpRsize) {
    this.type = type;
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

    this.rtcpMux = rtcpMux;
    this.rtcpRsize = rtcpRsize;

    this.rtx = rtx;
  }


  toRtpParameters() {

    const headerExtensions = this.extension;
    const rtcp = {
      "reducedSize": this.rtcpRsize,
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

}
