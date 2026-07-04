# TypeScript + Vite + Canvas โดยไม่มี runtime dependency

เราเขียนเกมด้วย TypeScript เรนเดอร์ลง HTML5 Canvas เอง โดยไม่ใช้ game framework (Phaser) หรือ UI framework (React) — ลอจิก match-3 เล็กพอจะเขียนเองได้ เกมจึงเบา โหลดไวบนมือถือเครื่องเก่า และไม่มีวันพังเพราะ library เลิกซัพพอร์ต (โปรเจกต์นี้ตั้งใจให้มีอายุยาวโดยแทบไม่ต้องบำรุงรักษา) dependency ที่มีคือ devDependencies เท่านั้น: vite, typescript, vitest

## Considered Options

- **Phaser 3** — ได้ระบบ scene/tween/เสียงฟรี แต่ bundle ~1MB+ และเพิ่มภาระอัปเดตตาม framework
- **React + DOM/CSS** — เขียน UI ง่าย แต่อนิเมชันตก/ระเบิดต่อเนื่องคุมยากและกระตุกบนเครื่องเก่า

## Consequences

- ต้องเขียนระบบอนิเมชัน (playback), เสียงสังเคราะห์ (Web Audio) และ service worker เองทั้งหมด — แลกกับความทนทานระยะยาว
- Dialog และปุ่มใช้ DOM overlay (ไม่วาดใน canvas) เพื่อได้ฟอนต์ไทยคมและ accessibility ฟรี
