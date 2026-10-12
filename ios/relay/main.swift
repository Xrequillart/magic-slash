// Replays desktop/src/main/remote/relay-vectors.json against RelayCrypto.swift, so the
// Swift and Node halves of the relay are proven to agree byte for byte. There is no iOS test
// target; run it by hand (macOS, from the repo root) after touching either crypto file:
//
//   npm run ios:relay-check
//
// It sits outside ios/MagicSlash/ on purpose: that folder is synchronized into the app
// target, and a second `main` there would break the build.

import CryptoKit
import Foundation

func hex(_ s: String) -> Data {
  var data = Data()
  var i = s.startIndex
  while i < s.endIndex {
    let j = s.index(i, offsetBy: 2)
    data.append(UInt8(s[i..<j], radix: 16)!)
    i = j
  }
  return data
}

func check(_ ok: Bool, _ label: String) {
  print(ok ? "ok - \(label)" : "not ok - \(label)")
  if !ok { exit(1) }
}

let url = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "desktop/src/main/remote/relay-vectors.json")
let v = try! JSONSerialization.jsonObject(with: Data(contentsOf: url)) as! [String: Any]
let header = v["header"] as! [String: Any]
let macId = v["macId"] as! String, phoneId = v["phoneId"] as! String

let macPriv = try! P256.KeyAgreement.PrivateKey(rawRepresentation: hex(v["macPrivate"] as! String))
let phonePriv = try! P256.KeyAgreement.PrivateKey(rawRepresentation: hex(v["phonePrivate"] as! String))
let macPub = try! P256.KeyAgreement.PublicKey(x963Representation: hex(v["macPublic"] as! String))
let phonePub = try! P256.KeyAgreement.PublicKey(x963Representation: hex(v["phonePublic"] as! String))
check(macPriv.publicKey.x963Representation == macPub.x963Representation, "mac public key matches its private key")

let expected = hex(v["key"] as! String)
let fromPhone = RelayCrypto.deriveKey(shared: try! phonePriv.sharedSecretFromKeyAgreement(with: macPub), macId: macId, phoneId: phoneId)
let fromMac = RelayCrypto.deriveKey(shared: try! macPriv.sharedSecretFromKeyAgreement(with: phonePub), macId: macId.uppercased(), phoneId: phoneId)
check(fromPhone.withUnsafeBytes { Data($0) } == expected, "phone side derives the Node key")
check(fromMac.withUnsafeBytes { Data($0) } == expected, "mac side derives it too, whatever the uuid case")

let aad = RelayCrypto.aad(type: header["type"] as! String, from: header["from"] as! String, to: header["to"] as! String,
                          epoch: header["epoch"] as! String, seq: header["seq"] as! Int)
check(String(data: aad, encoding: .utf8) == v["aad"] as? String, "aad string matches")

let box = Data(base64Encoded: v["box"] as! String)!
let plaintext = RelayCrypto.open(box, key: fromPhone, aad: aad)
check(plaintext.flatMap { String(data: $0, encoding: .utf8) } == v["plaintext"] as? String, "Node box opens in Swift")
check(RelayCrypto.open(box, key: fromPhone, aad: RelayCrypto.aad(type: "state", from: macId, to: phoneId, epoch: header["epoch"] as! String, seq: 41)) == nil,
  "a box replayed under another seq is refused")

let resealed = try! RelayCrypto.seal(Data((v["plaintext"] as! String).utf8), key: fromPhone, aad: aad,
                                     nonce: try! AES.GCM.Nonce(data: hex(v["nonce"] as! String)))
check(resealed == box, "Swift seal reproduces the Node box")

let token = Data(base64URLEncoded: v["token"] as! String)!
check(token.count == 32, "token decodes to 32 bytes")
check(RelayCrypto.pairingCode(token: token, macPublic: macPub.x963Representation, phonePublic: phonePub.x963Representation) == v["pairingCode"] as? String,
  "pairing code matches")
print("relay vectors: all good")
