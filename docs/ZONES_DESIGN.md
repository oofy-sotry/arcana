# 사냥터 구역 설계

## 구조

- 7개 레벨 구간 × 10개 속성 구역 = **70개 구역**
- 각 구역: 일반 몬스터 + 구역 보스 + 히든 스테이지
- 히든 스테이지: 수동 사냥 시 0.001% 진입 (자동 사냥 불가)

## 상성 적용

- 파티 펫 각각 독립 상성 계산
- 내 펫 속성 vs 구역 속성 → 데미지 배율
- 유리: ×1.25 / 중립: ×1.0 / 불리: ×0.80

---

## 레벨 구간별 구역 목록

### 1단계 (Lv 1~10) — 아르카나 입구

| 구역 ID | 이름 | 속성 | 분위기 |
|---------|------|------|--------|
| zone_1_fire | 잿빛 언덕 | fire | 불씨가 남은 평원, 첫 번째 균열 흔적 |
| zone_1_water | 안개 늪지 | water | 짙은 안개, 얕은 물웅덩이 |
| zone_1_wind | 바람의 평원 | wind | 끊임없이 바람이 부는 초원 |
| zone_1_earth | 갈색 황야 | earth | 척박한 흙 지형, 낮은 바위 |
| zone_1_thunder | 번개 초원 | thunder | 맑은 날에도 번개가 치는 들판 |
| zone_1_ice | 서리 숲 | ice | 사계절 얼어붙은 작은 숲 |
| zone_1_poison | 독초 들판 | poison | 독성 식물이 자라는 황폐한 들 |
| zone_1_dragon | 알의 계곡 | dragon | 드래곤 알이 방치된 협곡 |
| zone_1_light | 빛의 입구 | light | 균열 근처, 이상하게 밝은 지대 (해금 후) |
| zone_1_dark | 어둠의 입구 | dark | 균열 근처, 이상하게 어두운 지대 (해금 후) |

### 2단계 (Lv 11~20) — 속성 지역 외곽

| 구역 ID | 이름 | 속성 | 분위기 |
|---------|------|------|--------|
| zone_2_fire | 화염 동굴 입구 | fire | 용암 흐르는 동굴 초입 |
| zone_2_water | 폭포 분지 | water | 거대한 폭포 아래 분지 |
| zone_2_wind | 폭풍 협곡 | wind | 바람이 수렴하는 협곡 |
| zone_2_earth | 거석 평원 | earth | 거대한 바위들이 늘어선 평원 |
| zone_2_thunder | 뇌운 고원 | thunder | 항상 먹구름이 낀 고원 |
| zone_2_ice | 빙하 계곡 | ice | 천년 된 빙하가 흐르는 계곡 |
| zone_2_poison | 독기 늪 | poison | 독기가 차오른 늪지대 |
| zone_2_dragon | 용의 길목 | dragon | 드래곤 이동 경로 |
| zone_2_light | 성소 외곽 | light | Luxis 성소 근처 (Luxis_rep 30+ 접근 가능) |
| zone_2_dark | 폐허 외곽 | dark | Noctis 폐허 근처 (Noctis_rep 30+ 접근 가능) |

### 3단계 (Lv 21~30) — 속성 지역 중심

| 구역 ID | 이름 | 속성 |
|---------|------|------|
| zone_3_fire | 용암 지대 | fire |
| zone_3_water | 심해 입구 | water |
| zone_3_wind | 회오리 숲 | wind |
| zone_3_earth | 대지의 심장 | earth |
| zone_3_thunder | 번개 탑 | thunder |
| zone_3_ice | 영구 동토 | ice |
| zone_3_poison | 독의 심연 | poison |
| zone_3_dragon | 드래곤 둥지 | dragon |
| zone_3_light | Luxis 성소 | light |
| zone_3_dark | Noctis 폐허 | dark |

### 4단계 (Lv 31~40) — 속성 심층부

| 구역 ID | 이름 | 속성 |
|---------|------|------|
| zone_4_fire | 화산 내부 | fire |
| zone_4_water | 심해 | water |
| zone_4_wind | 사이클론 핵 | wind |
| zone_4_earth | 지각 심부 | earth |
| zone_4_thunder | 뇌신의 전당 | thunder |
| zone_4_ice | 절대 빙원 | ice |
| zone_4_poison | 독룡의 소굴 | poison |
| zone_4_dragon | 드래곤 왕국 | dragon |
| zone_4_light | Luxis 신전 | light |
| zone_4_dark | Noctis 암흑성 | dark |

### 5단계 (Lv 41~50) — 경계 지역

| 구역 ID | 이름 | 속성 |
|---------|------|------|
| zone_5_fire | 불의 성역 | fire |
| zone_5_water | 망각의 해저 | water |
| zone_5_wind | 폭풍의 눈 | wind |
| zone_5_earth | 세계의 기둥 | earth |
| zone_5_thunder | 번개 왕좌 | thunder |
| zone_5_ice | 빙하 왕국 | ice |
| zone_5_poison | 독의 신전 | poison |
| zone_5_dragon | 드래곤 왕좌 | dragon |
| zone_5_light | 빛의 왕국 | light |
| zone_5_dark | 어둠의 왕국 | dark |

### 6단계 (Lv 51~60) — 아르카나 심부

| 구역 ID | 이름 | 속성 |
|---------|------|------|
| zone_6_fire | 아르카나 화염 계 | fire |
| zone_6_water | 아르카나 수류 계 | water |
| zone_6_wind | 아르카나 풍류 계 | wind |
| zone_6_earth | 아르카나 대지 계 | earth |
| zone_6_thunder | 아르카나 뇌신 계 | thunder |
| zone_6_ice | 아르카나 빙결 계 | ice |
| zone_6_poison | 아르카나 독기 계 | poison |
| zone_6_dragon | 아르카나 용신 계 | dragon |
| zone_6_light | 아르카나 광원 계 | light |
| zone_6_dark | 아르카나 심연 계 | dark |

### 7단계 (Lv 61~70) — 균열 근원부

| 구역 ID | 이름 | 속성 | 특이사항 |
|---------|------|------|---------|
| zone_7_fire | 균열 화염부 | fire | 아르카 영향 에레멘탈 등장 |
| zone_7_water | 균열 수류부 | water | 同 |
| zone_7_wind | 균열 풍류부 | wind | 同 |
| zone_7_earth | 균열 대지부 | earth | 同 |
| zone_7_thunder | 균열 뇌신부 | thunder | 同 |
| zone_7_ice | 균열 빙결부 | ice | 同 |
| zone_7_poison | 균열 독기부 | poison | 同 |
| zone_7_dragon | 균열 용신부 | dragon | 同 |
| zone_7_light | 균열 광원부 | light | 同 |
| zone_7_dark | 균열 심연부 | dark | 同 |

---

## 구역 보스 규칙

- 각 구역마다 1개 보스 몬스터 정의
- 등장 확률: 자동 사냥 10%, 수동 사냥 30%
- 보스는 일반 몬스터 대비 HP ×3, ATK ×2
- 보스 처치 시: 희귀 드롭 + 대량 경험치 + faction 이벤트 (일부 구역)

---

## 히든 스테이지 규칙

- 진입: 수동 사냥 시 0.001% 확률 (자동 사냥 불가)
- 내부: 히든 몬스터 3~5마리 연속 전투
- 히든 몬스터: 해당 속성 히든 에레멘탈 형태
- 보상: evo_stone 확정 드롭, 히든 장비 낮은 확률
- 히든 스테이지 몬스터: 구역 일반 몬스터의 2배 스펙

---

## 상성 테이블

속성 공격 시 데미지 배율 (행=공격자, 열=방어자):

| 공격＼방어 | fire | water | wind | earth | thunder | ice | poison | dragon | light | dark |
|-----------|------|-------|------|-------|---------|-----|--------|--------|-------|------|
| fire | 1.0 | 0.8 | 1.25| 1.0 | 1.0 | 1.25| 1.0 | 1.0 | 0.8 | 1.25|
| water | 1.25| 1.0 | 0.8 | 1.25 | 0.8 | 1.0 | 0.8 | 1.25| 1.0 | 1.0 |
| wind | 0.8 | 1.25 | 1.0 | 0.8 | 1.25 | 1.0 | 0.8 | 1.25| 1.0 | 1.0 |
| earth | 1.0 | 0.8 | 1.25| 1.0 | 0.8 | 1.25| 1.25 | 1.0 | 1.0 | 1.0 |
| thunder| 1.0 | 1.25 | 0.8 | 1.25 | 1.0 | 0.8 | 1.0 | 1.25| 1.0 | 0.8 |
| ice | 0.8 | 1.0 | 1.0 | 0.8 | 1.25 | 1.0 | 1.0 | 0.8 | 1.25| 1.25|
| poison | 1.0 | 1.25 | 1.25| 0.8 | 1.0 | 1.0 | 1.0 | 0.8 | 0.8 | 1.25|
| dragon | 1.25| 0.8 | 0.8 | 1.0 | 0.8 | 1.25| 1.25 | 1.0 | 1.0 | 0.8 |
| light | 1.25| 1.0 | 1.0 | 1.0 | 1.0 | 0.8 | 1.25 | 1.0 | 1.0 | 1.5 |
| dark | 0.8 | 1.0 | 1.0 | 1.0 | 1.25 | 0.8 | 0.8 | 1.25| 1.5 | 1.0 |
