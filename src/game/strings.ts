import type { FruitKind, Objective } from '../core/types';

const FRUIT_NAMES: Record<FruitKind, string> = {
  mango: 'มะม่วง',
  orange: 'ส้ม',
  grape: 'องุ่น',
  watermelon: 'แตงโม',
  mangosteen: 'มังคุด',
  banana: 'กล้วย',
};

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

// Sunday-first, matching Date#getDay() (0 = Sunday) and the grid built by
// calendarMonth.ts's firstWeekdayOfMonth.
const THAI_WEEKDAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export const STRINGS = {
  appTitle: 'สวนผลไม้ของแม่',
  play: 'เล่น',
  back: 'กลับ',
  retry: 'เล่นอีกครั้ง',
  backToMap: 'กลับแผนที่',
  backToCalendar: 'กลับปฏิทิน',
  continueLabel: 'ไปต่อ',
  winTitle: 'เก่งมาก!',
  loseTitle: 'ไม่เป็นไรนะ ลองใหม่ได้เลย',
  dailyBloomText: 'ดอกไม้ประจำวันบานแล้ว',
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
  dailyGardenButton: 'สวนประจำวัน',
  dailyGardenHint: 'วันนี้ยังไม่ได้เก็บดอกไม้เลยนะ',
  dailyGardenBloomedToday: 'วันนี้เก็บดอกไม้แล้ว',
  calendarBackLabel: 'กลับแผนที่',
  calendarPrevMonth: 'เดือนก่อนหน้า',
  calendarNextMonth: 'เดือนถัดไป',
  calendarWeekdaysShort: THAI_WEEKDAYS_SHORT,
  calendarMonthYear: (month: number, year: number) => `${THAI_MONTHS[month - 1]} ${year + 543}`,
  calendarDayLabel: (day: number, bloomed: boolean) => (bloomed ? `วันที่ ${day} ดอกไม้บานแล้ว` : `วันที่ ${day}`),
  tutorialByLevel: {
    1: 'แตะหรือลากผลไม้ 2 ลูกที่อยู่ติดกัน สลับให้เรียงกัน 3 ลูกขึ้นไปนะ',
    2: 'ทำเป้าหมายด้านบนให้ครบก่อนตาเดินหมดนะ',
    3: 'ติดขัดเมื่อไหร่ กดปุ่มค้อนได้เลย ไม่เสียตาเดิน',
    61: 'เห็นช่องที่มีดอกไม้ไหม จับผลไม้บนช่องนั้นแล้วดอกจะบาน ได้ตาเดินเพิ่มอีก 1 ตานะ',
    // The second sentence is the load-bearing one: levels 69 and 70 are
    // unwinnable without knowing the big fruit can be dragged sideways, and
    // 65 itself can be beaten without ever discovering it. It is phrased
    // against the rule she already knows ("เรียงให้ครบ 3") rather than in the
    // abstract, so it lands as something she can act on.
    65: 'ผลไม้ลูกใหญ่ต้องพาลงตะกร้าที่แถวล่างสุดนะ ลากมันไปทางซ้ายหรือขวาได้เลย ไม่ต้องเรียงให้ครบ 3 ก็ลากได้',
    67: 'ด่านนี้ตะกร้ามีน้อยลง ถ้าลูกใหญ่ไม่ได้อยู่เหนือตะกร้าพอดี ก็ลากมันไปทางข้างๆ จนตรงตะกร้าได้เลยนะ',
    71: 'จับผลไม้ชนิดเดียวกันทีเดียว 6 ลูกขึ้นไป จะได้เม็ดสายฝน กวาดหายทั้งแถวนอนและแถวตั้งเลย',
  } as Record<number, string>,
  calendarHint: 'สวนนี้มีใหม่ให้ทุกวัน เล่นจบวันไหนก็ได้ดอกไม้ของวันนั้น ถ้าเว้นไปวันไหนไม่เป็นไรเลยนะ ย้อนกลับมาเล่นวันเก่าได้เสมอ',
  objectiveText(objective: Objective): string {
    switch (objective.type) {
      case 'collect':
        return `เก็บ${FRUIT_NAMES[objective.fruit]} ${objective.count} ลูก`;
      case 'jelly':
        return 'เคลียร์วุ้นให้หมด';
      case 'score':
        return `ทำแต้ม ${objective.target}`;
      case 'deliver':
        return `ส่งผลไม้ลูกใหญ่ลงตะกร้า ${objective.count} ลูก`;
    }
  },
  fruitName(fruit: FruitKind): string {
    return FRUIT_NAMES[fruit];
  },
};
