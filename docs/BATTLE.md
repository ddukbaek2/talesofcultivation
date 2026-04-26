# 전투 규칙 정리

`src/part/battlepart.js` 와 `assets/data/table/*.json` 을 기준으로 정리한 현재 전투 시스템 명세.

---

## 1. 개요

- 1대1 턴제 카드 전투. 좌측은 플레이어, 우측은 상대(AI).
- 한 쪽의 체력이 0 이 되면 종료. 플레이어는 전투포기 버튼으로 즉시 패배 처리할 수 있다.
- 화면은 상단(상대 손패/덱/묘패/초상화) → 중앙(두 캐릭터 무대) → 하단(플레이어 손패/덱/묘패/초상화/턴 종료 버튼) 구성.

---

## 2. 자원

각 플레이어는 세 가지 자원을 가진다.

| 자원 | 의미 | 기본 시작값 | 기본 최대치 | 매턴 변화 | 카드 비용으로 소모? |
| --- | --- | --- | --- | --- | --- |
| **체력 (HP)** | 0 이 되면 패배 | `STARTING_HEALTH` = 30 | 캐릭터별 `maxHealth` (기본 30) | 자연 회복 없음 | X |
| **행동력 (AP)** | 카드 사용 비용 | `STARTING_ACTION_POINTS` = 1 | `STARTING_ACTION_POINT_CAP` = 3 | 매 턴 시작 시 `actionPointGainPerTurn` 만큼 maxActionPoints 증가 → currentActionPoints 가 max 로 채워짐 | O |
| **영력 (Energy)** | 미래 확장용 자원 (현재 어떤 카드도 비용으로 소모하지 않음) | 캐릭터별 `startingEnergy` (기본 1) | 캐릭터별 `energyCap` (기본 5) | 매 턴 `energyGainPerTurn` 만큼 maxEnergy 증가 → currentEnergy 채워짐 | X (현재) |

> 카드의 `cost` 필드는 **행동력** 비용을 뜻한다. 행동력이 부족한 카드는 사용 시 "행동력 부족" 메시지가 뜨고 사용되지 않는다.

### 캐릭터별 오버라이드 (charactertable.json)

캐릭터 정의에 다음 필드를 추가하면 기본값을 덮어쓸 수 있다.

- `maxHealth`
- `energyCap`, `startingEnergy`, `energyGainPerTurn`
- `actionPointCap`, `startingActionPoints`, `actionPointGainPerTurn`

예: 검종 장로 (10000002) → `maxHealth: 270`, `energyCap: 30`, `startingEnergy: 9`, `energyGainPerTurn: 3`.

---

## 3. 카드 / 산패 / 묘패 / 손패

- **산패 (Deck)**: 사용 가능한 카드 더미. `charactertable.json` 의 `cardIds` 순서대로 구성된다.
- **묘패 (Discard)**: 사용한 카드가 쌓이는 더미. 산패가 비면 묘패를 셔플해 산패로 재활용한다.
- **손패 (Hand)**: 매 턴 산패에서 1장을 뽑아 추가. `MAX_HAND_SIZE` = 10.
- **시작 손패**: 양쪽 모두 `STARTING_HAND_SIZE` = 4 장.
- 산패 / 묘패 슬롯을 클릭하면 더미 보기 팝업이 열려 들어간 순서 그대로 카드 목록(이름 + 설명)이 보인다.

### 카드 정의 (cardtable.json)

| 필드 | 의미 |
| --- | --- |
| `id` | 카드 고유 식별자 |
| `displayName` | 손패에 표시되는 이름 |
| `description` | 카드 본문. 안의 숫자는 `effects` 순서대로 현재 버프 보정값으로 치환되어 표시됨 |
| `color` | 카드 배경색 |
| `isSpecial` | 등급 표시용 플래그 |
| `grade` | 1~3 등급. 카드 cost 원의 색상 결정 |
| `cost` | 사용 시 소모할 행동력 |
| `sect` | 종파 식별자 (뒷면 디자인) |
| `element` | 속성 (현재 게임 로직엔 사용되지 않음, 데이터만 보유) |
| `cardType` | `attack` / `defense` / `buff` / `mixed`. `attack` 일 때만 집중·내공이 데미지에 가산 |
| `effects` | 효과 배열. 아래 §5 참조 |

---

## 4. 턴 진행

1. **게임 시작 (`reset()`)**
   - 양쪽 캐릭터에 정의를 적용하고 산패를 채운 뒤, 양쪽이 각각 4장 드로우.
   - 플레이어가 먼저 행동.
2. **플레이어 턴**
   - 손패 카드를 클릭 → 선택 (살짝 들어 올림). 다시 클릭 → 사용. 다른 곳을 클릭 → 선택 해제.
   - 카드 사용 시 행동력 비용을 소모하고 `effects` 가 순서대로 적용됨.
   - 행동력이 남았어도 직접 "행동 종료" 버튼을 눌러야 턴이 넘어감.
   - "전투 포기" 버튼은 `endGameMessage` 가 비어 있을 때만 활성화.
3. **상대 턴 (AI)**
   - `OPPONENT_TURN_DELAY` = 1.0초 후 행동 시작.
   - `pickOpponentBestCard()` — 손패 중 행동력으로 사용 가능하며 `cardScore` 가 가장 높은 카드를 선택. (점수: damage = +value, block = +value × 0.7, heal = 부족 체력 분만큼 +value, 그 외 = 0)
   - 한 장 사용 후 `OPPONENT_BETWEEN_CARDS_DELAY` 만큼 쉬고 다음 카드 시도. 행동력이 0 이거나 손패가 비면 턴 종료.
4. **턴 시작 처리 (`startTurn`)**
   - `isTurnTemporary` 버프 (방어, 회피, 내공) 제거.
   - `decayPerTurn` 버프 (약화, 취약) 의 value 1 감소. 0 이하면 제거.
   - maxEnergy / maxActionPoints 가 각각 `gainPerTurn` 만큼 증가 (캡 적용) → current 값을 max 로 채움.
   - 산패에서 1장 드로우.

---

## 5. 카드 효과 타입 (`effects[i].type`)

| 타입 | 동작 | 적용 대상 |
| --- | --- | --- |
| `damage` | 피해 = `value + 힘 + (공격카드면 집중 + 내공)` → 약화 시 ×0.75 → 상대 취약 시 ×1.5 → 음수면 0. `applyDamage` 로 상대에게 적용 | 상대 |
| `block` | `value + 민첩` 만큼 방어 버프 누적 | 자신 |
| `heal` | 체력을 `value` 만큼 회복 (maxHealth 캡) | 자신 |
| `actionPoint` | 행동력을 `value` 만큼 회복 (actionPointCap 캡, maxActionPoints 도 같이 끌어올림) | 자신 |
| `weaken`, `vulnerable` | 디버프를 상대에게 부여 | 상대 |
| `strength`, `dexterity`, `focus`, `dodge`, `empower` | 버프를 자신에게 부여 | 자신 |

> `addBuff` 는 같은 id 가 이미 있으면 value 합산, 0 이하면 제거. 없는데 `value <= 0` 이면 추가하지 않음.

### 데미지 계산 순서 (`applyDamage`)

1. **회피(`dodge`)** — value > 0 이면 회피 1 차감 후 데미지 무효화 (조기 반환). "회피!" 플로팅.
2. 상대 **취약(`vulnerable`)** — 데미지 ×1.5 (소수점 floor).
3. **방어(`block`)** — 흡수 가능한 만큼 차감, 흡수량은 "방 -N" 으로 표시.
4. 남은 데미지를 체력에서 차감 (체력 음수면 0). "-N" 으로 표시.

> `damage` 효과의 약화·취약·힘·집중·내공 가산은 **카드 사용자(`actor`) 측 playCard** 에서 계산되고, applyDamage 는 받는 쪽의 회피·취약·방어만 계산한다.

---

## 6. 버프 / 디버프 종류 (bufftable.json)

각 항목의 `description` 안의 `{N}` 은 현재 value 로 치환되어 툴팁에 표시된다.

| key | 표시명 | 종류 | 지속 | 효과 |
| --- | --- | --- | --- | --- |
| `block` | 방어 | 버프 | `isTurnTemporary` (대상 본인의 다음 턴 시작 시 제거) | 받은 피해 흡수. 흡수 시 value 가 줄고 0 되면 제거 |
| `strength` | 힘 | 버프 | 영구 | 자신이 가하는 데미지 +N |
| `dexterity` | 민첩 | 버프 | 영구 | 자신이 펼치는 방어 +N |
| `weaken` | 약화 | 디버프 | `decayPerTurn` (매 본인 턴 시작 -1) | 자신의 데미지 ×0.75 (값과 무관하게 1 이상이면 발동) |
| `vulnerable` | 취약 | 디버프 | `decayPerTurn` | 자신이 받는 데미지 ×1.5 |
| `focus` | 집중 | 버프 | 영구 (다만 공격 카드 1회 사용 후 즉시 제거) | 다음 공격 카드의 데미지 +N |
| `dodge` | 회피 | 버프 | `isTurnTemporary` | 다음 공격 N회를 통째로 무효화. 받을 때마다 -1 |
| `empower` | 내공 | 버프 | `isTurnTemporary` | 이번 턴 동안 사용하는 모든 공격 카드 데미지 +N (소모 없음) |

> `block` / `dodge` / `empower` 는 본인 다음 턴 시작 시 일괄 제거되므로, "이번 턴 한정" 의미가 강하다. 단 `block` 은 그 사이 받은 피해로 더 일찍 소진될 수 있다.

---

## 7. 입력 / 조작

| 입력 | 동작 |
| --- | --- |
| 손패 카드 클릭 1회 | 선택 (살짝 들림 + 우측에 효과 미리보기 툴팁) |
| 같은 카드 다시 클릭 | 사용 |
| 다른 위치 클릭 | 선택 해제 |
| 산패 / 묘패 슬롯 클릭 | 더미 보기 팝업 |
| 더미 보기 팝업 X / 바깥 클릭 | 닫기 |
| 버프 아이콘을 누르고 있음 | 해당 버프 툴팁 표시 |
| 행동 종료 버튼 | 턴 넘김 |
| 전투 포기 버튼 | 즉시 패배 처리 |
| 대사창에서 Ctrl 키 | 노벨파트 대사 고속 재생 + 자동 진행 |

---

## 8. 카드 텍스트 동적 갱신

손패 카드 본문과 선택 카드 툴팁의 수치는 매 프레임 `getEffectiveCardDescription` / `computeAdjustedEffectValues` 로 재계산된다.

- 적용되는 보정: 자신의 힘, 민첩, 약화, 집중, 내공 + 상대의 취약.
- 버프가 빠지면 (decay / 소모 / 턴 만료) 다음 프레임에 즉시 원래 수치 또는 새 수치로 복귀한다.
- 더미 보기 팝업은 정의 원문 그대로 표시 (보정 미적용).

---

## 9. 즉시 피드백 (플로팅 텍스트)

`applyDamage` 와 `playCard` 의 효과 처리에서 무대 캐릭터 위에 짧게 떠오르는 텍스트가 출력된다.

| 상황 | 표시 | 색상 |
| --- | --- | --- |
| 회피 발동 | `회피!` | 회피 색 (#aaccdd) |
| 방어 흡수 | `방 -N` | 파란색 |
| 체력 손실 | `-N` | 붉은색 |
| 방어 부여 | `방 +N` | 파란색 |
| 체력 회복 | `+N` | 녹색 |
| 행동력 회복 | `행동력 +N` | 노란색 |
| 버프 부여 | `<버프명> +N` | 버프 정의 color |

---

## 10. 게임 종료

- `checkGameOver()` 가 양쪽 체력을 검사. 누군가 0 이면 `#endGameMessage` 설정 (승/패).
- 메시지가 비어 있지 않으면 행동 종료 / 전투 포기 버튼이 비활성화되고, 화면 하단에 결과 문구가 노출된다.
