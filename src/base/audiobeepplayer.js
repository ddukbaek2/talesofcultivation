//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;


//==============================================================================
// 비프 파형 종류.
//==============================================================================
export const BeepWaveform = System.Object.freeze({
	sine: "sine",
	square: "square",
	sawtooth: "sawtooth",
	triangle: "triangle",
});


//==============================================================================
// 오디오 비프 플레이어.
// 오디오 파일 없이 Web Audio API 의 OscillatorNode 로 비프 효과음을 합성 재생한다.
// 공유 AudioContext 를 주입받아 마스터 GainNode 를 통해 출력한다.
//==============================================================================
export class AudioBeepPlayer {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @private @type { AudioContext | null } */ #audioContext;
	/** @private @type { GainNode | null } */ #masterGainNode;
	/** @private @type { boolean } */ #isMuted;
	/** @private @type { number } */ #masterVolume;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @constructor
	 * @param { AudioContext | null } audioContext
	 */
	constructor(audioContext) {
		this.#audioContext = audioContext;
		this.#masterGainNode = null;
		this.#isMuted = false;
		this.#masterVolume = 1.0;

		if (audioContext) {
			this.#masterGainNode = audioContext.createGain();
			this.#masterGainNode.gain.value = this.#masterVolume;
			this.#masterGainNode.connect(audioContext.destination);
		}
	}

	//==============================================================================
	// 단일 톤 재생.
	// 시작 시각에 맞춰 OscillatorNode 를 생성하고 attack/release 엔벨로프로 감싸 재생한다.
	//==============================================================================
	/**
	 * @param { number } frequency 주파수 (Hz).
	 * @param { number } durationMilliseconds 지속 시간 (밀리초).
	 * @param { string } waveform BeepWaveform 값.
	 * @param { number } volume 볼륨 (0.0 ~ 1.0).
	 * @param { number } startOffsetSeconds 시작 지연 (초).
	 */
	playTone(frequency, durationMilliseconds, waveform, volume, startOffsetSeconds) {
		const audioContext = this.getAudioContext();
		if (!audioContext) {
			return;
		}
		const masterGainNode = this.getMasterGainNode();
		if (!masterGainNode) {
			return;
		}

		// 오디오 컨텍스트가 일시 중단된 경우 재개 후 재생.
		if (audioContext.state === "suspended") {
			audioContext.resume().then(() => {
				this.scheduleTone(frequency, durationMilliseconds, waveform, volume, startOffsetSeconds);
			});
			return;
		}

		this.scheduleTone(frequency, durationMilliseconds, waveform, volume, startOffsetSeconds);
	}

	//==============================================================================
	// 내부 톤 스케줄링.
	//==============================================================================
	/**
	 * @param { number } frequency
	 * @param { number } durationMilliseconds
	 * @param { string } waveform
	 * @param { number } volume
	 * @param { number } startOffsetSeconds
	 */
	scheduleTone(frequency, durationMilliseconds, waveform, volume, startOffsetSeconds) {
		const audioContext = this.getAudioContext();
		if (!audioContext) {
			return;
		}
		const masterGainNode = this.getMasterGainNode();
		if (!masterGainNode) {
			return;
		}

		const durationSeconds = durationMilliseconds / 1000.0;
		const attackSeconds = System.Math.min(0.005, durationSeconds * 0.2);
		const releaseSeconds = System.Math.min(0.020, durationSeconds * 0.4);
		const sustainSeconds = System.Math.max(0.0, durationSeconds - attackSeconds - releaseSeconds);
		const currentTime = audioContext.currentTime;
		const startTime = currentTime + startOffsetSeconds;
		const sustainEndTime = startTime + attackSeconds + sustainSeconds;
		const stopTime = sustainEndTime + releaseSeconds;

		const oscillatorNode = audioContext.createOscillator();
		oscillatorNode.type = waveform;
		oscillatorNode.frequency.setValueAtTime(frequency, startTime);

		const envelopeGainNode = audioContext.createGain();
		envelopeGainNode.gain.setValueAtTime(0.0, startTime);
		envelopeGainNode.gain.linearRampToValueAtTime(volume, startTime + attackSeconds);
		envelopeGainNode.gain.setValueAtTime(volume, sustainEndTime);
		envelopeGainNode.gain.linearRampToValueAtTime(0.0, stopTime);

		oscillatorNode.connect(envelopeGainNode);
		envelopeGainNode.connect(masterGainNode);

		oscillatorNode.onended = () => {
			oscillatorNode.disconnect();
			envelopeGainNode.disconnect();
		};

		oscillatorNode.start(startTime);
		oscillatorNode.stop(stopTime);
	}

	//==============================================================================
	// 톤 시퀀스 재생.
	// 각 톤의 지속 시간과 간격을 누적해 순차적으로 예약한다.
	//==============================================================================
	/**
	 * @param { Array<{ frequency: number, durationMilliseconds: number, waveform: string, volume: number, gapMilliseconds?: number }> } toneList
	 */
	playSequence(toneList) {
		const audioContext = this.getAudioContext();
		if (!audioContext) {
			return;
		}

		let cumulativeSeconds = 0.0;
		for (const toneEntry of toneList) {
			const frequency = toneEntry.frequency;
			const durationMilliseconds = toneEntry.durationMilliseconds;
			const waveform = toneEntry.waveform;
			const volume = toneEntry.volume;
			const gapMilliseconds = toneEntry.gapMilliseconds ? toneEntry.gapMilliseconds : 0;
			this.playTone(frequency, durationMilliseconds, waveform, volume, cumulativeSeconds);
			cumulativeSeconds += (durationMilliseconds + gapMilliseconds) / 1000.0;
		}
	}

	//==============================================================================
	// 프리셋: 클릭.
	// 짧은 고음 스퀘어 톤.
	//==============================================================================
	playClick() {
		this.playTone(880, 30, BeepWaveform.square, 0.2, 0.0);
	}

	//==============================================================================
	// 프리셋: 확인.
	// 상승 두 음.
	//==============================================================================
	playConfirm() {
		this.playSequence([
			{ frequency: 660, durationMilliseconds: 80, waveform: BeepWaveform.triangle, volume: 0.3 },
			{ frequency: 990, durationMilliseconds: 120, waveform: BeepWaveform.triangle, volume: 0.3 },
		]);
	}

	//==============================================================================
	// 프리셋: 취소.
	// 하강 두 음.
	//==============================================================================
	playCancel() {
		this.playSequence([
			{ frequency: 550, durationMilliseconds: 80, waveform: BeepWaveform.triangle, volume: 0.3 },
			{ frequency: 330, durationMilliseconds: 120, waveform: BeepWaveform.triangle, volume: 0.3 },
		]);
	}

	//==============================================================================
	// 프리셋: 오류.
	// 거친 저음 스퀘어 톤 두 번.
	//==============================================================================
	playError() {
		this.playSequence([
			{ frequency: 200, durationMilliseconds: 140, waveform: BeepWaveform.square, volume: 0.25, gapMilliseconds: 30 },
			{ frequency: 180, durationMilliseconds: 220, waveform: BeepWaveform.square, volume: 0.25 },
		]);
	}

	//==============================================================================
	// 프리셋: 성공.
	// 상행 삼화음 (C5 E5 G5).
	//==============================================================================
	playSuccess() {
		this.playSequence([
			{ frequency: 523, durationMilliseconds: 90, waveform: BeepWaveform.sine, volume: 0.3 },
			{ frequency: 659, durationMilliseconds: 90, waveform: BeepWaveform.sine, volume: 0.3 },
			{ frequency: 784, durationMilliseconds: 160, waveform: BeepWaveform.sine, volume: 0.3 },
		]);
	}

	//==============================================================================
	// 프리셋: 경고.
	// 동일 음 반복.
	//==============================================================================
	playWarning() {
		this.playSequence([
			{ frequency: 700, durationMilliseconds: 90, waveform: BeepWaveform.square, volume: 0.25, gapMilliseconds: 60 },
			{ frequency: 700, durationMilliseconds: 90, waveform: BeepWaveform.square, volume: 0.25 },
		]);
	}

	//==============================================================================
	// 프리셋: 알림.
	// 부드러운 두 음 핑.
	//==============================================================================
	playNotification() {
		this.playSequence([
			{ frequency: 988, durationMilliseconds: 70, waveform: BeepWaveform.sine, volume: 0.3 },
			{ frequency: 1318, durationMilliseconds: 180, waveform: BeepWaveform.sine, volume: 0.3 },
		]);
	}

	//==============================================================================
	// 마스터 볼륨 설정.
	//==============================================================================
	/**
	 * @param { number } value 0.0 ~ 1.0 범위 값.
	 */
	setMasterVolume(value) {
		this.#masterVolume = value;
		if (this.#masterGainNode && !this.#isMuted) {
			this.#masterGainNode.gain.value = value;
		}
	}

	//==============================================================================
	// 마스터 볼륨 반환.
	//==============================================================================
	/**
	 * @returns { number }
	 */
	getMasterVolume() {
		return this.#masterVolume;
	}

	//==============================================================================
	// 음소거.
	//==============================================================================
	mute() {
		if (this.#masterGainNode) {
			this.#masterGainNode.gain.value = 0.0;
			this.#isMuted = true;
		}
	}

	//==============================================================================
	// 음소거 해제.
	//==============================================================================
	unmute() {
		if (this.#masterGainNode) {
			this.#masterGainNode.gain.value = this.#masterVolume;
			this.#isMuted = false;
		}
	}

	//==============================================================================
	// 음소거 여부 반환.
	//==============================================================================
	/**
	 * @returns { boolean }
	 */
	isMuted() {
		return this.#isMuted;
	}

	//==============================================================================
	// 오디오 컨텍스트 반환.
	//==============================================================================
	/**
	 * @returns { AudioContext | null }
	 */
	getAudioContext() {
		return this.#audioContext;
	}

	//==============================================================================
	// 마스터 게인 노드 반환.
	//==============================================================================
	/**
	 * @returns { GainNode | null }
	 */
	getMasterGainNode() {
		return this.#masterGainNode;
	}
}
