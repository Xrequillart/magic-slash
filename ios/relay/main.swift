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
let signPriv = try! P256.Signing.PrivateKey(rawRepresentation: hex(v["signPrivate"] as! String))
let signPub = hex(v["signPublic"] as! String)
check(signPriv.publicKey.x963Representation == signPub, "signing public key matches its private key")
let signedPayload = Data((v["signedPayload"] as! String).utf8)
let nodeSignature = Data(base64Encoded: v["signature"] as! String)!
check(RelayCrypto.verify(signature: nodeSignature, message: signedPayload, publicKey: signPub), "Node signature verifies in Swift")
var tamperedPayload = signedPayload
tamperedPayload[10] ^= 1
check(!RelayCrypto.verify(signature: nodeSignature, message: tamperedPayload, publicKey: signPub), "a tampered payload is refused")
let swiftSignature = try! signPriv.signature(for: signedPayload).rawRepresentation
check(swiftSignature.count == 64, "Swift signature is raw r||s, 64 bytes")
check(RelayCrypto.verify(signature: swiftSignature, message: signedPayload, publicKey: signPub), "Swift signature verifies")
let pinned = Data(base64Encoded: v["signatureCryptoKit"] as! String)!
check(RelayCrypto.verify(signature: pinned, message: signedPayload, publicKey: signPub),
  "the pinned CryptoKit signature verifies (crypto.test.ts checks it in Node)")

let pushKey = SymmetricKey(data: hex(v["pushKey"] as! String))
let pushAAD = RelayCrypto.pushAAD(macId: macId.uppercased(), phoneId: phoneId, pairingId: v["pairingId"] as! String, kind: v["kind"] as! String)
check(String(data: pushAAD, encoding: .utf8) == v["pushAad"] as? String, "push aad matches, whatever the uuid case")
let pushBox = Data(base64Encoded: v["pushBox"] as! String)!
check(RelayCrypto.openPush(pushBox, pushKey: pushKey, aad: pushAAD).flatMap { String(data: $0, encoding: .utf8) } == v["pushPlaintext"] as? String,
  "Node push box opens in Swift")
check(RelayCrypto.openPush(pushBox, pushKey: pushKey, aad: RelayCrypto.pushAAD(macId: macId, phoneId: phoneId, pairingId: v["pairingId"] as! String, kind: "completed")) == nil,
  "a push box moved to another kind is refused")
check(RelayCrypto.openPush(pushBox, pushKey: fromPhone, aad: pushAAD) == nil, "the pair key does not open a push box")
let pushResealed = try! RelayCrypto.sealPush(Data((v["pushPlaintext"] as! String).utf8), pushKey: pushKey, aad: pushAAD,
                                             nonce: try! AES.GCM.Nonce(data: hex(v["pushNonce"] as! String)))
check(pushResealed == pushBox, "Swift sealPush reproduces the Node push box")
print("relay vectors: all good")
