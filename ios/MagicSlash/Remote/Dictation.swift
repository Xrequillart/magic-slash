import AVFoundation
import Speech

/// Turns the user's voice into the prompt's text, for the composer's microphone button.
///
/// What is said is added after what the field already holds, live, as the recogniser hears
/// it. On the iPhone itself when its language allows it, so the words do not leave the phone
/// any more than the prompt does; through Apple's servers otherwise, as the keyboard's own
/// dictation would.
@MainActor
@Observable
final class Dictation {
  enum State: Equatable {
    case idle, starting, listening
  }

  /// Why the microphone gave nothing, until the next try.
  enum Problem: Equatable {
    case denied, unavailable
  }

  private(set) var state: State = .idle
  private(set) var problem: Problem?
  /// The field's text as dictation last wrote it: what it held before, then what was said.
  /// Nil until a dictation starts.
  private(set) var text: String?

  var isActive: Bool { state != .idle }

  @ObservationIgnored private var engine: AVAudioEngine?
  @ObservationIgnored private var request: SFSpeechAudioBufferRecognitionRequest?
  @ObservationIgnored private var task: SFSpeechRecognitionTask?
  /// What the field held at the start, spaced from what will be said.
  @ObservationIgnored private var prefix = ""
  /// What was said in the pauses before the current stretch of speech: the recogniser starts
  /// its transcript afresh after a pause, and would otherwise drop it.
  @ObservationIgnored private var said = ""
  /// The last transcript heard, and whether the recogniser marked it as the end of a stretch.
  @ObservationIgnored private var last = ""
  @ObservationIgnored private var lastEnded = false
  /// Counts the dictations, so a late result of a stopped one is dropped.
  @ObservationIgnored private var generation = 0

  /// Listens, adding what is said after `field`. Asks for the microphone and speech
  /// recognition the first time.
  func start(after field: String) async {
    guard state == .idle else { return }
    problem = nil
    state = .starting
    generation += 1
    let current = generation

    guard await Self.authorized() else {
      if generation == current { fail(.denied) }
      return
    }
    // Stopped while iOS asked.
    guard generation == current, state == .starting else { return }
    guard let recognizer = SFSpeechRecognizer(), recognizer.isAvailable else {
      fail(.unavailable)
      return
    }

    let request = SFSpeechAudioBufferRecognitionRequest()
    request.shouldReportPartialResults = true
    request.addsPunctuation = true
    if recognizer.supportsOnDeviceRecognition { request.requiresOnDeviceRecognition = true }

    let engine = AVAudioEngine()
    do {
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.record, mode: .measurement, options: .duckOthers)
      try session.setActive(true, options: .notifyOthersOnDeactivation)
      guard Self.tap(engine.inputNode, into: request) else { throw DictationError.noInput }
      engine.prepare()
      try engine.start()
    } catch {
      engine.inputNode.removeTap(onBus: 0)
      Self.releaseAudio()
      fail(.unavailable)
      return
    }

    self.engine = engine
    self.request = request
    prefix = field.isEmpty || field.last?.isWhitespace == true ? field : field + " "
    text = field
    said = ""
    last = ""
    lastEnded = false
    state = .listening
    task = Self.recognize(recognizer, request) { [weak self] transcript, ended, done in
      Task { @MainActor in self?.receive(transcript, ended: ended, done: done, generation: current) }
    }
  }

  /// Stops listening. What was heard so far stays in the field.
  func stop() {
    guard state != .idle else { return }
    generation += 1
    if let engine {
      engine.stop()
      engine.inputNode.removeTap(onBus: 0)
    }
    request?.endAudio()
    task?.cancel()
    engine = nil
    request = nil
    task = nil
    Self.releaseAudio()
    state = .idle
  }

  private func receive(_ transcript: String?, ended: Bool, done: Bool, generation current: Int) {
    guard current == generation, state == .listening else { return }
    if let transcript, !transcript.isEmpty {
      // A transcript that does not carry on the last one is a new stretch of speech, once the
      // last was marked as ended, or when it is far shorter (an end the recogniser did not
      // mark): the last one is kept. A shorter one otherwise is the recogniser rewording.
      if !last.isEmpty, !transcript.hasPrefix(last), lastEnded || transcript.count < last.count / 2 {
        said += last + " "
      }
      last = transcript
      lastEnded = ended
      text = prefix + said + transcript
    }
    // A final result, an error, or the recogniser's own time limit.
    if done { stop() }
  }

  private func fail(_ problem: Problem) {
    self.problem = problem
    state = .idle
  }

  private enum DictationError: Error {
    case noInput
  }

  // MARK: Off the main actor
  //
  // Speech and AVAudioEngine call back on their own queues. Their closures are made here, out
  // of the main actor, so Swift does not assume them on it and trap when they run elsewhere.

  /// Both permissions, asked in turn: speech recognition, then the microphone.
  nonisolated private static func authorized() async -> Bool {
    let speech = await withCheckedContinuation { continuation in
      SFSpeechRecognizer.requestAuthorization { continuation.resume(returning: $0) }
    }
    guard speech == .authorized else { return false }
    return await AVAudioApplication.requestRecordPermission()
  }

  /// Feeds the microphone to the request. False when there is no microphone to hear.
  nonisolated private static func tap(_ input: AVAudioInputNode, into request: SFSpeechAudioBufferRecognitionRequest) -> Bool {
    let format = input.outputFormat(forBus: 0)
    guard format.channelCount > 0, format.sampleRate > 0 else { return false }
    input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
      request.append(buffer)
    }
    return true
  }

  nonisolated private static func recognize(
    _ recognizer: SFSpeechRecognizer,
    _ request: SFSpeechAudioBufferRecognitionRequest,
    report: @escaping @Sendable (_ transcript: String?, _ ended: Bool, _ done: Bool) -> Void
  ) -> SFSpeechRecognitionTask {
    recognizer.recognitionTask(with: request) { result, error in
      // The metadata comes with the last result of a stretch of speech, before a pause.
      report(
        result?.bestTranscription.formattedString,
        result?.speechRecognitionMetadata != nil,
        error != nil || result?.isFinal == true
      )
    }
  }

  /// Gives the audio back to whatever the dictation quieted.
  nonisolated private static func releaseAudio() {
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }
}
