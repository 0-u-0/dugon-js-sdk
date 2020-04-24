
import Media from './media'

const validFilter = RegExp.prototype.test.bind(/^([a-z])=(.*)/);

//TODO: use regex later
String.prototype.splitOnce = function (separator) {
  const [first, ...rest] = this.split(separator)
  if (rest.length > 0) {
    return [first, rest.join(separator)]
  } else {
    return [this]
  }
}


export default class Sdp {

  /**
   * 
   * @param {String} sdpStr 
   */
  static parse(sdpStr) {
    //split line
    let session = null;
    let lines = sdpStr.split(/(\r\n|\r|\n)/).filter(validFilter);

    //check medialines
    let mediaIndexs = [];
    for (let index in lines) {
      if (lines[index][0] == 'm') {
        mediaIndexs.push(index)
      }
    }

    if (0 === mediaIndexs.length) {
      //no media, session only
      session = Sdp.handleSession(lines);
    } else {
      session = Sdp.handleSession(lines.slice(0, mediaIndexs[0]))

      for (let i in mediaIndexs) {
        let mediaLines = null;
        if (i == (mediaIndexs.length - 1)) {
          mediaLines = lines.slice(mediaIndexs[i])
        } else {
          mediaLines = lines.slice(mediaIndexs[i], mediaIndexs[i + 1])
        }
        session.medias.push(Sdp.handleMedia(mediaLines));
      }

    }


    return session;
  }

  /**
   * 
   * @param {Array<String>} lines 
   * @returns Session
   */
  static handleSession(lines) {
    let session = new Sdp();
    for (let line of lines) {
      let type = line[0];
      let value = line.slice(2);

      switch (type) {
        case "v":
          session.version = value;
          break;
        case "o":
          session.origin = value;
          break;
        case "s":
          session.name = value;
          break;
        case "t":
          session.timing = value
          break;
        case "a":
          let attrPair = value.splitOnce(":")
          console.log(attrPair)
          if (attrPair.length == 2) {
            let attrKey = attrPair[0]
            let attrValue = attrPair[1]
            switch (attrKey) {
              case "group":
                //TODO:
                session.group = attrValue
              case "msid-semantic":
                session.msidSemantic = attrValue
              default:
                console.log(`unknown attr ${attrKey}`)
            }
          }
        default:
          console.log(`unknown  type ${type}`)
      }
    }
    return session;
  }

  /**
   * 
   * @param {Array<String>} lines 
   * @returns Media
   */
  static handleMedia(lines) {
    let media = new Media()
    // for (line of lines) {
    //   let type = line[0];
    //   let value = line.slice(2);

    //   switch type {
    //     case "m":
    //       let pattern = #"(video|audio|application) ([0-9]+) ([A-Z/]+) ([[0-9]|\s]+)"#
    //       let result = value.matchingStrings(regex: pattern)
    //       if result.count == 5 {
    //         media.type = result[1]
    //         //TODO: Int
    //         media.port = Int(result[2])
    //         media.proto = result[3]
    //         //FIXME: use array
    //         let payloads = result[4].components(separatedBy: " ")
    //         for payload in payloads {
    //           let rtp = Rtp(payload: Int(payload)!)
    //           media.rtps.append(rtp)
    //         }
    //       }
    //     case "c":
    //       media.connection = value
    //     case "a":
    //       let attrPair = value.splitOnce(separator: ":")
    //       if attrPair.count == 1{
    //         switch value {
    //           case "rtcp-mux":
    //             media.rtcpMux = true
    //           case "rtcp-rsize":
    //             media.rtcpRsize = true
    //           case "sendrecv", "sendonly", "recvonly", "inactive":
    //             media.direction = value
    //           default:
    //             print("unknown attr c1 \(value)")
    //         }
    //       } else if attrPair.count == 2{
    //         let attrKey = attrPair[0]
    //         let attrValue = attrPair[1]
    //         switch attrKey {
    //           case "ice-ufrag":
    //             media.iceUfrag = attrValue
    //           case "ice-pwd":
    //             media.icePwd = attrValue
    //           case "ice-options":
    //             media.iceOptions = attrValue
    //           case "setup":
    //             media.setup = attrValue
    //           case "mid":
    //             //TODO: to Int
    //             media.mid = attrValue
    //           case "rtcp":
    //             //TODO: destruct
    //             media.rtcp = attrValue
    //           case "msid":
    //             media.msid = attrValue
    //           case "fingerprint":
    //             let fingerprintPair = attrValue.splitOnce(separator: " ")
    //             //TODO: check pair count
    //             media.fingerprint = Fingerprint(algorithm: fingerprintPair[0], hash: fingerprintPair[1])
    //           case "extmap":
    //             let pattern = #"([0-9]+) (\S+)"#
    //             let result = value.matchingStrings(regex: pattern)
    //             if result.count == 3 {
    //               let ext = Extension(id: Int(result[1])!, uri: result[2])
    //               media.extensions.append(ext)
    //             }

    //           case "rtpmap":
    //             let pattern = #"([0-9]+) ([\w-]+)/([0-9]+)(?:/([0-9]+))?"#
    //             let result = value.matchingStrings(regex: pattern)
    //             if result.count >= 4 {
    //               guard let payload = Int(result[1]) else { break }
    //               if result[2] == "rtx" {
    //                 media.rtxPayloads.append(payload)
    //               } else {
    //                 if let index = media.getRtpIndex(payload: payload)  {
    //                   media.rtps[index].codec = result[2]
    //                   media.rtps[index].rate = Int(result[3])
    //                   if result.count == 5 {
    //                     media.rtps[index].channels = Int(result[4])!
    //                   }
    //                 }
    //               }
    //             }
    //           case "rtcp-fb":
    //             let pattern = #"([0-9]+) ([\w\p{Z}-]+)"#
    //             let result = value.matchingStrings(regex: pattern)
    //             //TODO: check count
    //             if let index = media.getRtpIndex(payload: Int(result[1])!)  {
    //               let rf = result[2].splitOnce(separator: " ")
    //               if rf.count == 1 {
    //                 media.rtps[index].rtcpFb.append(RtcpFeedback(type: rf[0]))
    //               } else if rf.count == 2{
    //                 media.rtps[index].rtcpFb.append(RtcpFeedback(type: rf[0], parameter: rf[1]))
    //               }
    //             }
    //           case "fmtp":
    //             let pattern = #"([0-9]+) ([\w-;=]+)"#
    //             let result = value.matchingStrings(regex: pattern)
    //             //TODO: check count

    //             guard let payload = Int(result[1]) else { break }

    //             if media.rtxPayloads.contains(payload) {
    //               let config = result[2].splitOnce(separator: "=")
    //               let mainPayload = Int(config[1])!
    //               if let index = media.getRtpIndex(payload: mainPayload)  {
    //                 media.rtps[index].rtx = payload
    //               }
    //             } else {
    //               if let index = media.getRtpIndex(payload: payload)  {
    //                 let fmtps = result[2].split(separator: ";")
    //                 for f in fmtps {
    //                   let value = f.split(separator: "=")
    //                   media.rtps[index].fmtp[value[0]] = value[1]
    //                 }
    //               }
    //             }

    //           case "ssrc":
    //             //https://tools.ietf.org/html/rfc5576#page-5
    //             let pattern = #"([0-9]+) ([\w]+):([\w\W\b]+)$"#
    //             let result = value.matchingStrings(regex: pattern)


    //             if media.ssrc == nil {
    //               media.ssrc = Int(result[1])!
    //             }
    //             if  result[2] == "cname" {
    //               if media.cname == nil{
    //                 media.cname = result[3]
    //               }
    //             }

    //           //TODO: check count
    //           //                            let ssrc = Ssrc(id: Int(result[1])!, attribute: result[2], value: result[3])
    //           //                            media.ssrcs.append(ssrc)
    //           case "ssrc-group":
    //             let pattern = #"([\w]+) ([0-9\p{Z}]+)"#
    //             let result = value.matchingStrings(regex: pattern)
    //             if result.count == 3 {
    //               if result[1] == "FID" {
    //                 let ssrcs = result[2].splitOnce(separator: " ")

    //                 //TODO: check count
    //                 if media.ssrc == nil {
    //                   media.ssrc = Int(ssrcs[0])!
    //                 }

    //                 if media.rtxSsrc == nil {
    //                   media.rtxSsrc = Int(ssrcs[1])!
    //                 }
    //               }
    //               //                                let sg = SsrcGroup(semantics: result[1], ssrcs: ssrcs)
    //               //                                media.ssrcGroups.append(sg)
    //             }
    //           case "candidate":
    //             //TODO: address it later
    //             break
    //           default:
    //             print("unknown attr c2 \(attrKey)")
    //         }
    //       }

    //     default:
    //       print("unknown  type \(type)")
    //   }
    // }
    return media

  }


  constructor() {
    this.version = 0;
    this.origin = '- 10000 2 IN IP4 127.0.0.1';
    this.timing = '0 0';
    this.name = '-'
    //TODO: remove ,use bundle
    this.group = null;
    this.msidSemantic = ' WMS *';
    this.fingerprint = null;

    this.medias = []
  }

  toString() {
    let lines = []
    if (this.version != null) {
      lines.push(`v=${this.version}`)
    }

    if (this.origin) {
      lines.push("o=- 10000 2 IN IP4 127.0.0.1")
    }

    if (this.name) {
      lines.push(`s=${this.name}`)
    }

    if (this.timing) {
      lines.push(`t=${this.timing}`)
    }

    if (this.msidSemantic) {
      lines.push(`a=msid-semantic:${this.msidSemantic}`)
    }

    let mids = this.medias.filter(m => m.available || m.mid == 0).map(m => m.mid).join(' ')
    lines.push(`a=group:BUNDLE ${mids}`)

    if (this.fingerprint) {
      lines.push(`a=fingerprint:${this.fingerprint.algorithm} ${this.fingerprint.hash}`)
    }

    for (let media of this.medias) {
      lines.push(media.toSdp2())
    }

    let sdp = lines.join('\r\n')

    sdp = sdp + '\r\n'
    return sdp
  }
}
