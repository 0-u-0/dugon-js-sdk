
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
  static createMedia(mid, codec, sdp) {
    let media;
    for (let m of sdp.media) {
      if (m.mid == mid) {
        media = m;
        break;
      }
    }
    if (media) {
      let payload, rate, channels,
        fmtp, rtx, cname;

      let rtcpMux = false, rtcpRsize = false;

      let rtcpFb = [];

      //TODO: h264
      // H264_BASELINE,H264_CONSTRAINED_BASELINE,H264_MAIN,H264_HIGH
      if (codec.slice(0, 4) == 'H264') {
        let profile;
        if (codec.slice(5) == 'BASELINE') {
          profile = H264_BASELINE;
        } else if (codec.slice(5) == 'CONSTRAINED-BASELINE') {
          profile = H264_CONSTRAINED_BASELINE;
        } else if (codec.slice(5) == 'MAIN') {
          profile = H264_MAIN;
        } else if (codec.slice(5) == 'HIGH') {
          profile = H264_HIGH;
        }

        codec = 'H264';
        for (let f of media.fmtp) {
          if (f.config.includes(profile)) {
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
          rtcpFb.push({
            type: tf.type,
            parameter: tf.subtype
          });

        }
      }

      if (media.rtcpRsize) {
        rtcpRsize = true;
      }
      if (media.rtcpMux) {
        rtcpMux = true;
      }

      return new Media(media.type, codec, payload, rate, mid, cname, channels,
        fmtp, media.ssrcs, media.ssrcGroups, rtcpFb, media.ext, rtx, rtcpMux, rtcpRsize);

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

    const headerExtensions = this.extension.map(e => {
      return {
        'id': e.value,
        'uri': e.uri,
        'encrypt': false,
        'parameters': {}
      }
    });
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
        "rtcpFeedback": this.rtcpFb.map(r => {
          return {
            type: r.type,
            parameter: this.parameter ? this.parameter : ""
          }
        })
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
