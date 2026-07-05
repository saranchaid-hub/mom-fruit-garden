import type { FruitKind, Objective } from '../core/types';

const FRUIT_NAMES: Record<FruitKind, string> = {
  mango: 'มะม่วง',
  orange: 'ส้ม',
  grape: 'องุ่น',
  watermelon: 'แตงโม',
  mangosteen: 'มังคุด',
  banana: 'กล้วย',
};

export const STRINGS = {
  appTitle: 'สวนผลไม้ของแม่',
  play: 'เล่น',
  back: 'กลับ',
  retry: 'เล่นอีกครั้ง',
  backToMap: 'กลับแผนที่',
  continueLabel: 'ไปต่อ',
  winTitle: 'เก่งมาก!',
  loseTitle: 'ไม่เป็นไรนะ ลองใหม่ได้เลย',
  movesLeft: 'ตาที่เหลือ',
  score: 'คะแนน',
  level: (id: number) => `ด่าน ${id}`,
  gardenName: (sectionNumber: number) => `สวนที่ ${sectionNumber}`,
  locked: 'ยังไม่เปิด',
  hammerLabel: 'ค้อน',
  mercyBanner: 'โบนัสพิเศษ +5 ตา!',
  reshuffleToast: 'สลับผลไม้ให้ใหม่นะ',
  settingsTitle: 'ตั้งค่า',
  settingsMusic: 'เพลง',
  settingsSfx: 'เสียงเอฟเฟกต์',
  settingsHints: 'คำใบ้',
  settingsSlowAnimation: 'เคลื่อนไหวช้าลง',
  settingsGearLabel: 'ตั้งค่า',
  tutorialGotIt: 'เข้าใจแล้ว',
  tutorialByLevel: {
    1: 'แตะหรือลากผลไม้ 2 ลูกที่อยู่ติดกัน สลับให้เรียงกัน 3 ลูกขึ้นไปนะ',
    2: 'ทำเป้าหมายด้านบนให้ครบก่อนตาเดินหมดนะ',
    3: 'ติดขัดเมื่อไหร่ กดปุ่มค้อนได้เลย ไม่เสียตาเดิน',
  } as Record<number, string>,
  objectiveText(objective: Objective): string {
    switch (objective.type) {
      case 'collect':
        return `เก็บ${FRUIT_NAMES[objective.fruit]} ${objective.count} ลูก`;
      case 'jelly':
        return 'เคลียร์วุ้นให้หมด';
      case 'score':
        return `ทำแต้ม ${objective.target}`;
    }
  },
  fruitName(fruit: FruitKind): string {
    return FRUIT_NAMES[fruit];
  },
};
