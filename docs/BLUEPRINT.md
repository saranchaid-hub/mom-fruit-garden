# พิมพ์เขียว: "สวนผลไม้ของแม่" — เกม Match-3 ใจดีสำหรับคุณแม่

## Context

เกมแนว Candy Crush ให้คุณแม่ (ผู้สูงอายุ อยู่บ้านคนเดียวตอนกลางวัน) เล่นฆ่าเวลาแบบเพลินๆ บนคอมและมือถือ ฟรี 100% — กติกาเหมือนต้นฉบับ (สลับจับ 3, ลูกกวาดพิเศษ, เล่นเป็นด่าน) แต่ตัดความกดดันออก: ไม่มีระบบชีวิต ไม่รอเวลา แพ้แล้วเล่นซ้ำทันที ผ่านการ grilling ครบ 13 คำถามกับผู้ใช้แล้ว **แผนนี้คือพิมพ์เขียว — ยังไม่สร้างจนกว่าจะสั่ง**

## การตัดสินใจทั้งหมด (จาก grilling session)

1. **แพลตฟอร์ม**: เว็บแอป PWA บน GitHub Pages — ฟรีถาวร ติดตั้งไอคอนหน้าจอโฮมได้ เล่นออฟไลน์ได้
2. **Stack**: TypeScript + Vite + HTML5 Canvas, **zero runtime dependency** (devDeps: vite, typescript, vitest เท่านั้น)
3. **Kindness model**: move limit ใจดี (+35-50% จากปกติ), ไม่มีชีวิต/รอเวลา/โฆษณา/ซื้อของ, แพ้ → ข้อความอ่อนโยน + เล่นซ้ำทันที, แพ้ด่านเดิม 2 ครั้งติด → รอบถัดไปแถม +5 ตา (Mercy Moves)
4. **เป้าหมายด่าน 3 แบบ**: เก็บผลไม้ตามชนิด / เคลียร์วุ้น / ทำแต้ม
5. **เม็ดพิเศษ**: ลาย (จับ 4), ห่อ (จับ L/T), ระเบิดสายรุ้ง (จับ 5) + คอมโบผสมครบ 6 คู่
6. **กระดาน**: สูงสุด 8×8 (เม็ด ≥45px บนมือถือ), เริ่ม 6×6/4 ชนิด ไต่ไป 8×8/6 ชนิด, รองรับรูปทรงเว้าแหว่ง
7. **ด่าน**: 60 ด่าน เป็นไฟล์ข้อมูล TS (เติมได้ไม่แตะโค้ด), ดาว 1-3 (ผ่าน = ≥1 ดาวเสมอ), ย้อนเล่นได้ตลอด
8. **ธีม**: ผลไม้ไทย 6 ชนิด (มะม่วง ส้ม องุ่น แตงโม มังคุด กล้วย) — แยกได้ด้วยรูปทรง ไม่ใช่แค่สี
9. **ควบคุม**: swipe + tap-tap บนมือถือ, ลากเมาส์ + คลิกสองครั้งบนคอม
10. **ตัวช่วย**: คำใบ้อัตโนมัติ (นิ่ง 8 วิ, ปิดได้), สับกระดานอัตโนมัติเมื่อตัน (ฟรี), ค้อนฟรี 3 ครั้ง/ด่าน — ไม่มี Undo
11. **เสียง**: SFX สังเคราะห์ด้วย Web Audio API + เพลงเบาๆ, ปุ่มปิดแยกเพลง/เอฟเฟกต์
12. **UI**: ไทยล้วน ฟอนต์ ≥20px ปุ่ม ≥48px ข้อความน้อย
13. **ชื่อเกม**: "สวนผลไม้ของแม่"
14. **เซฟ**: localStorage ต่อเครื่อง (ไม่ sync ข้ามเครื่อง — ยอมรับ), สอนเล่นใน 3 ด่านแรก, ตั้งค่า: เพลง/SFX/คำใบ้/ความเร็วอนิเมชัน (ปกติ/ช้า)

## สถาปัตยกรรม

### กฎเหล็กข้อเดียว

`src/core/` = ลอจิกเกมล้วน **ห้าม import DOM/Canvas/อะไรจาก `src/game/`** → ทดสอบใน Node ได้ 100% ไม่ต้อง mock | `src/game/` = ทุกอย่างที่แตะเบราว์เซอร์ import จาก core ได้อิสระ

### โครงสร้างไฟล์

```
Game_For_Mom/
├── index.html                     # หน้าเดียว: <canvas> + DOM overlay สำหรับ dialog/ปุ่ม
├── package.json / tsconfig.json (strict) / vite.config.ts (base: '/Game_For_Mom/')
├── .github/workflows/deploy.yml   # test → build → deploy GitHub Pages (เทสต์พังแล้วเกมพังจะไม่ถึงมือแม่)
├── scripts/build-sw.mjs           # postbuild: สแกน dist/ ใส่รายการ precache + hash ลง sw
├── public/
│   ├── manifest.webmanifest       # ชื่อไทย, standalone, portrait
│   ├── icons/ (icon.svg ต้นฉบับมะม่วง + 192/512 PNG + apple-touch-icon)
│   └── sw.template.js             # service worker เขียนเอง ~50 บรรทัด cache-first
├── src/
│   ├── main.ts                    # boot + ลงทะเบียน SW
│   ├── core/                      # ★ PURE LOGIC
│   │   ├── types.ts               # ทุก contract: Board, Cell, Piece, LevelDef, TurnEvent, SaveData
│   │   ├── rng.ts                 # mulberry32 seeded PRNG
│   │   ├── board.ts               # สร้าง/parse layout string/จัดการช่องปิด
│   │   ├── match.ts               # หา run 3/4/5, รวมกลุ่ม, จำแนก L/T, จัดลำดับเกิดเม็ดพิเศษ
│   │   ├── specials.ts            # เอฟเฟกต์เม็ดพิเศษ + ตารางคอมโบ 6 คู่
│   │   ├── resolve.ts             # ไปป์ไลน์เทิร์น: swap/ค้อน → cascade loop → TurnResult
│   │   ├── moves.ts               # หาตาเดินที่เหลือ (brute force ≤112 คู่) + reshuffle
│   │   ├── objectives.ts          # ความคืบหน้าเป้าหมาย, แต้ม, ดาว, ชนะ/แพ้
│   │   ├── session.ts             # LevelSession: mutation แค่ trySwap / useHammer / reshuffleIfStuck
│   │   └── levels/                # schema.ts + levels-01-20.ts / 21-40 / 41-60 + index.ts
│   ├── game/
│   │   ├── app.ts                 # state machine ของจอ + ลูป rAF เดียว
│   │   ├── screens/ (title.ts, map.ts, play.ts, dialogs.ts — dialog เป็น DOM ไม่ใช่ canvas)
│   │   ├── render/ (renderer.ts DPR/layout, fruits.ts วาดผลไม้ Path2D, effects.ts, playback.ts)
│   │   ├── input.ts               # pointer → semantic action (swipe/tap-tap/ค้อน) แยกจากลอจิก
│   │   ├── audio/ (sfx.ts สังเคราะห์, music.ts ลูปเบาๆ)
│   │   ├── save.ts                # localStorage แบบมี version
│   │   ├── strings.ts             # ข้อความไทยทั้งเกมรวมที่เดียว
│   │   └── tutorial.ts            # สเต็ปสอนเล่นแบบ declarative ด่าน 1-3
│   └── styles.css                 # ฟอนต์ ≥20px, ปุ่ม ≥48px
└── tests/                         # vitest, import จาก core เท่านั้น
    (match, resolve, specials, moves, gravity, objectives, levels).test.ts
```

### Data model หลัก (ใน core/types.ts)

- `Piece { id, fruit: FruitKind|null, special: 'none'|'stripedH'|'stripedV'|'wrapped'|'colorBomb' }` — id คงที่ให้ renderer ตามเม็ดข้ามการตกได้
- `Cell { kind: 'normal'|'hole', jelly: boolean, piece }`, `Board { width≤8, height≤8, cells[] }`
- `LevelDef { id, layout: string[] ('.'=ปกติ 'X'=ช่องปิด 'J'=วุ้น), fruits[4-6], moves (บวก buffer ใจดีแล้ว), objective, starScores: [2ดาว, 3ดาว], tutorial? }`
- `SaveData { version, unlockedLevel, stars{}, failStreak{levelId,count}, settings{music,sfx,hints,animSpeed} }`

### หัวใจการออกแบบ: TurnResult event list

ลอจิกคำนวณทั้งเทิร์นเสร็จทันที (ซิงโครนัส deterministic) แล้วคืน `TurnResult { phases: TurnEvent[][], boardAfter, outcome }` — เหตุการณ์เช่น swap/clear/specialFire/fall/refill/score/reshuffle — ฝั่ง `playback.ts` เอาไปเล่นเป็นอนิเมชันทีละ phase (150ms/phase, ×1.6 เมื่อตั้งค่า "ช้า") **ลอจิกไม่เคยรออนิเมชัน** → เทสต์กับโค้ดจริง, ตั้งค่าความเร็วไม่มีวันทำลอจิกพัง, อินพุตล็อกระหว่างเล่น playback (ทีละอย่าง เหมาะกับผู้สูงอายุ)

### อัลกอริทึม match/cascade (สรุป)

1. สแกนแถว+คอลัมน์หา run ≥3 → merge run ที่แชร์ช่องเป็นกลุ่ม → จำแนก: run ≥5 → colorBomb, กลุ่มสองแนว (L/T) → wrapped, run 4 → striped (แนวนอน→stripedV), จับ 3 → ไม่เกิดพิเศษ; เม็ดพิเศษเกิดที่ช่องที่ผู้เล่นสลับเข้า
2. การเคลียร์เป็น BFS activation queue — เคลียร์โดนเม็ดพิเศษ → จุดชนวนต่อเนื่องใน phase เดียว; คอมโบ (พิเศษ×พิเศษ) ตรวจก่อน match detection ใช้ตารางคอมโบตรงๆ
3. Cascade loop: clear → gravity (ตกตรงลง ข้ามช่องปิด) → refill (สุ่มจาก rng ของ session) → วนจนไม่มี match ใหม่, ตัวคูณแต้มตามลูกโซ่
4. ตาเดิน: brute-force swap ทุกคู่ที่ติดกันแล้วเช็ก match (<1ms บน 8×8) — cache ไว้ใช้ทั้งเช็กตันและคำใบ้; reshuffle เก็บ multiset เม็ดเดิมสุ่มตำแหน่งใหม่จน (มีตาเดิน ∧ ไม่มี match ค้าง)
5. RNG: mulberry32 seed ได้ — production seed จากเวลา, เทสต์ seed คงที่ → cascade ทำซ้ำได้เป๊ะ

### โค้งความยาก 60 ด่าน (sawtooth นุ่มๆ — ด่านยากตามด้วยด่านง่าย 1-2 ด่านเสมอ)

| ด่าน | กระดาน/ผลไม้ | เปิดตัว |
|---|---|---|
| 1-3 | 6×6 / 4 | สอนเล่น: สลับ จับ 3 อ่านเป้าหมาย |
| 4-7 | 6×6 / 4 | ด่าน 5 เม็ดลาย, ด่าน 6 เป้าแต้มแรก |
| 8-12 | 6×6-7×7 / 4 | ด่าน 8 วุ้น, ด่าน 11 กระดาน 7×7 |
| 13-17 | 7×7 / 4-5 | ด่าน 13 กระดานเว้าแหว่ง, ด่าน 16 ผลไม้ชนิดที่ 5 |
| 18-24 | 7×7 / 5 | ด่าน 19 เม็ดห่อ, ด่าน 21 กระดาน 8×8 |
| 25-30 | 8×8 / 5 | ด่าน 26 ระเบิดสายรุ้ง (ลด 4 ชนิดให้จับ 5 ง่าย) |
| 31-38 | 8×8 / 5-6 | ด่าน 31 ชนิดที่ 6, วุ้นบนกระดานรูปทรง |
| 39-48 | 8×8 / 5-6 | คอมโบเกิดธรรมชาติ วุ้นผืนใหญ่ |
| 49-60 | 8×8 / 6 | "สวนบัณฑิต" — ไม่ยากกว่าช่วง 40s, ด่าน 60 ฉลองจบง่ายๆ |

move limit ต่อด่าน = ประมาณตาที่ผู้เล่นทั่วไปใช้ × 1.35-1.5 ปัดขึ้น

### PWA + Deploy

- manifest ชื่อไทย standalone/portrait, `start_url: "."` (ทำงานใต้ base path), icon PNG 192/512 + apple-touch-icon (iOS บังคับ)
- SW เขียนเอง cache-first precache ทุกไฟล์ตอน install, `build-sw.mjs` stamp hash ลง CACHE_NAME → deploy ใหม่ล้าง cache เก่าอัตโนมัติ, ไม่มี prompt อัปเดต (แม่ไม่ต้องเห็น infrastructure — ได้เวอร์ชันใหม่ตอนเปิดครั้งถัดไป)
- GitHub Actions: push main → `npm ci && npm test && npm run build` → deploy-pages
- `index.html`: viewport `user-scalable=no` + `touch-action: none` บน canvas (กัน pull-to-refresh ตีกับ swipe)

## เอกสารที่จะสร้างตอนลงมือ (ตาม /domain-modeling)

**`CONTEXT.md`** — glossary ล้วน ไม่มี implementation detail:

เม็ดผลไม้ (Piece), ผลไม้ (Fruit — "สี" ของเกม 6 ชนิด), การจับ (Match ≥3 เรียง), เม็ดพิเศษ (ลาย/ห่อ/ระเบิดสายรุ้ง), คอมโบ (สลับพิเศษ×พิเศษ), ลูกโซ่ (Cascade), วุ้น (Jelly — สถานะติดช่อง), ช่องปิด (Blocked Cell), ตาเดิน (Move), **Mercy Moves** (+5 ตาหลังแพ้ 2 ครั้งติด), **Gentle Fail** (แพ้แบบไร้บทลงโทษ), ค้อน (Hammer ฟรี 3/ด่าน), คำใบ้ (Hint), ดาว (Stars ≥1 เสมอเมื่อผ่าน), เป้าหมายด่าน (Objective)

**`docs/adr/`** — 4 ฉบับ:
1. `0001-pwa-on-github-pages.md` — PWA แทน native; แลก: ไม่มี sync ข้ามเครื่อง
2. `0002-zero-dependency-canvas.md` — TS+Vite+Canvas ไม่ใช้ framework; แลก: เขียนอนิเมชัน/เสียงเอง
3. `0003-kindness-model.md` — คง move limit + Gentle Fail + Mercy Moves แทนตัด fail ทิ้ง (กำหนดสมดุลทั้ง 60 ด่าน — ย้อนยาก)
4. `0004-board-max-8x8.md` — accessibility (เม็ด ≥45px) มาก่อนความจุด่าน

## Milestones (ทุก milestone จบแบบเล่น/ตรวจได้)

- **M0 เล็ก** — Vite+TS scaffold, canvas วาดมะม่วง 1 ลูก, GitHub Actions deploy สำเร็จ, vitest ติดตั้ง (deploy ก่อน = ตัด risk ท้ายโปรเจกต์)
- **M1 ใหญ่** — `src/core/` ครบยกเว้น specials/levels + เทสต์ทั้งชุด (ตรวจ: npm test เขียว, harness พิมพ์กระดาน ASCII)
- **M2 กลาง** — renderer + input + playback, กระดาน sandbox ไม่มีเป้าหมาย (ตรวจ: cascade มันมือบนมือถือจริง — จุดที่เกมเริ่มสนุก)
- **M3 กลาง** — เม็ดพิเศษ + คอมโบ 6 คู่ + เอฟเฟกต์ + เทสต์
- **M4 กลาง** — schema ด่าน + 12 ด่านแรก, เป้าหมาย/แต้ม/ดาว, dialog ชนะ-แพ้, save, จอ map+title (ตรวจ: เล่น 1-12 จบ, เซฟอยู่, Mercy Moves ทำงานหลังแพ้ 2 ครั้ง)
- **M5 กลาง** — คำใบ้, ค้อน 3/ด่าน, สับอัตโนมัติ+toast, แบนเนอร์ +5 ตา, เสียง SFX+เพลง, จอตั้งค่า (ตรวจ: checklist เต็ม + ส่งให้คนไม่ใช่สายเทคลองเล่น)
- **M6 เล็ก** — manifest + SW + ไอคอน + สอนเล่นด่าน 1-3 (ตรวจ: เล่นจากไอคอนหน้าจอโฮมในโหมดเครื่องบิน ทั้ง iOS/Android)
- **M7 กลาง** — ด่าน 13-60 ตามตารางโค้ง, map สวนสวยๆ, เอฟเฟกต์ฉลอง, ตรวจ copy ไทย + grayscale pass
- **M8 ต่อเนื่อง** — **เทสต์เดียวที่สำคัญจริง: ยื่นมือถือให้คุณแม่ แล้วนั่งดูเงียบๆ** ทุกจังหวะที่แม่ลังเลคือบั๊ก — จูน: ขนาดเม็ด, ความไวปัด, move limit รายด่าน, ดีเลย์คำใบ้, ฟอนต์

## Verification

1. **Unit tests (vitest ใน Node)**: helper `parseBoard()` รับ ASCII fixture อ่านง่าย — ครอบคลุม: ทุกรูปแบบ match (3/4H/4V/5/L×4/T×4/+), เอฟเฟกต์+คอมโบพิเศษทุกคู่, cascade หลาย phase แบบ seed คงที่ assert กระดานจบเป๊ะ, สลับผิดไม่กินตา, ค้อนไม่กินตา, gravity รอบช่องปิด, ตรวจกระดานตัน+reshuffle, เป้าหมาย/ดาว/Mercy Moves, และ validate ด่านทั้ง 60 (layout ถูก, มีทาง refill, threshold เรียงถูก)
2. **Manual checklist บนมือถือจริง + devtools viewport 375px/320px**: เม็ด ≥45px, swipe+tap-tap ทำงาน, ไทย ≥20px, ปุ่ม ≥48px, เสียงปลดล็อกหลัง gesture แรก (iOS), สกรีนช็อต grayscale แยกผลไม้ได้ด้วยรูปทรง, โหมดเครื่องบินเล่นได้, A2HS ได้ไอคอน+ชื่อถูก, ปิดแอปเปิดใหม่เซฟอยู่, โหมดช้าช้าจริง, คำใบ้เด้งหลัง 8 วิและปิดได้
3. **CI gate**: เทสต์ต้องเขียวก่อน deploy — เวอร์ชันพังไม่มีทางถึงมือถือคุณแม่
