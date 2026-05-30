const { Telegraf } = require("telegraf");

const BOT_TOKEN = process.env.BOT_TOKEN || "YOUR_BOT_TOKEN_HERE";
const bot = new Telegraf(BOT_TOKEN);

// ─────────────────────────────────────────────
//  In-memory store (Serverless-safe per instance)
// ─────────────────────────────────────────────
const users = {}; // keyed by chat id

function getUser(id) {
  if (!users[id]) {
    users[id] = {
      family: {
        tasks: [
          { id: "parents_call", label: "الاتصال بالوالدين", done: false },
          { id: "relatives_visit", label: "زيارة الأقارب", done: false },
          { id: "friend_check", label: "تفقد صديق", done: false },
        ],
        weekStart: weekKey(),
      },
      wird: {
        goal: null,         // 'page' | 'two_pages' | 'half_hizb'
        streak: 0,
        lastDone: null,     // YYYY-MM-DD
        todayDone: false,
      },
      detox: {
        active: false,
        startedAt: null,
        completed: 0,
      },
    };
  }

  // Reset family tasks on new week
  const u = users[id];
  if (u.family.weekStart !== weekKey()) {
    u.family.weekStart = weekKey();
    u.family.tasks.forEach((t) => (t.done = false));
  }

  // Reset wird on new day
  if (u.wird.lastDone !== todayKey()) {
    u.wird.todayDone = false;
  }

  return u;
}

function weekKey() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────
//  KEYBOARDS
// ─────────────────────────────────────────────

const MAIN_MENU = {
  inline_keyboard: [
    [{ text: "مفكرة بر الوالدين وصلة الرحم", callback_data: "menu_family" }],
    [{ text: "منظم الاوراد وحفظ القرآن", callback_data: "menu_wird" }],
    [{ text: "مكتبة الحقوق والواجبات الشرعية", callback_data: "menu_rights" }],
    [{ text: "بوصلة القبلة وتوقيت الصلاة", callback_data: "menu_qibla" }],
    [{ text: "لوحة تصفية الذهن والتفكر", callback_data: "menu_detox" }],
  ],
};

const BACK_BTN = [{ text: "القائمة الرئيسية", callback_data: "main_menu" }];

function familyKeyboard(tasks) {
  const rows = tasks.map((t) => [
    {
      text: t.done ? `${t.label}  -  تمت الصلة` : t.label,
      callback_data: `family_toggle_${t.id}`,
    },
  ]);
  rows.push(BACK_BTN);
  return { inline_keyboard: rows };
}

function wirdGoalKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "صفحة واحدة يومياً", callback_data: "wird_set_page" }],
      [{ text: "صفحتان يومياً", callback_data: "wird_set_two_pages" }],
      [{ text: "نصف حزب يومياً", callback_data: "wird_set_half_hizb" }],
      BACK_BTN,
    ],
  };
}

function wirdDashKeyboard(todayDone) {
  const rows = [];
  if (!todayDone) {
    rows.push([{ text: "تم انجاز الورد", callback_data: "wird_done" }]);
  }
  rows.push([{ text: "تغيير المقدار", callback_data: "wird_change" }]);
  rows.push(BACK_BTN);
  return { inline_keyboard: rows };
}

function rightsKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "حقوق الوالدين", callback_data: "rights_parents" }],
      [{ text: "حقوق الجار", callback_data: "rights_neighbor" }],
      [{ text: "حقوق الزوج والزوجة", callback_data: "rights_spouse" }],
      [{ text: "حقوق الاصدقاء والاخوان", callback_data: "rights_friends" }],
      [{ text: "احكام المعاملات المالية", callback_data: "rights_finance" }],
      BACK_BTN,
    ],
  };
}

function qiblaKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "ارسال موقعي لحساب القبلة", callback_data: "qibla_request" }],
      BACK_BTN,
    ],
  };
}

function detoxKeyboard(active, completed) {
  const rows = [];
  if (!active) {
    rows.push([{ text: "ابدأ تحدي 10 دقائق", callback_data: "detox_start" }]);
  } else {
    rows.push([{ text: "اكملت التحدي", callback_data: "detox_confirm" }]);
  }
  rows.push(BACK_BTN);
  return { inline_keyboard: rows };
}

// ─────────────────────────────────────────────
//  TEXTS
// ─────────────────────────────────────────────

const RIGHTS_CONTENT = {
  parents: `حقوق الوالدين

البر واجب وهو الاحسان اليهما بالقول والفعل، وطاعتهما في غير معصية الله.
ويحرم عقوقهما بالاذى او الاهمال او رفع الصوت عليهما.`,

  neighbor: `حقوق الجار

يجب كف الاذى عنه والاحسان اليه بالسلام والزيارة وتفقد حاله.
قال النبي صلى الله عليه وسلم: "ما زال جبريل يوصيني بالجار حتى ظننت انه سيورثه".`,

  spouse: `حقوق الزوج والزوجة

للزوجة: النفقة والمعاشرة بالمعروف والمهر وعدم الاضرار.
للزوج: الطاعة في المعروف والحفاظ على البيت والتعاون على بناء الاسرة.`,

  friends: `حقوق الاصدقاء والاخوان

النصيحة والصدق والوفاء والدعاء لهم في ظهر الغيب.
ومن حقوقهم: عيادتهم عند المرض وتشييع جنائزهم وتفقد احوالهم.`,

  finance: `احكام المعاملات المالية

يحرم الربا بكل صوره ويحل البيع والشراء بالتراضي.
يجب اداء الامانات ورد الحقوق لاصحابها، ويحرم الغش والتدليس في البيوع.`,
};

const WIRD_LABELS = {
  page: "صفحة واحدة",
  two_pages: "صفحتان",
  half_hizb: "نصف حزب",
};

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────

function familyProgress(tasks) {
  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const bar = "█".repeat(done) + "░".repeat(total - done);
  return `${bar}  ${done}/${total}`;
}

// Qibla calculation
function calcQibla(lat, lon) {
  const KAABA_LAT = 21.4225;
  const KAABA_LON = 39.8262;
  const dLon = ((KAABA_LON - lon) * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lat2 = (KAABA_LAT * Math.PI) / 180;
  const x = Math.sin(dLon) * Math.cos(lat2);
  const y =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  let angle = (Math.atan2(x, y) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  return Math.round(angle);
}

function compassDir(angle) {
  const dirs = ["شمال", "شمال شرق", "شرق", "جنوب شرق", "جنوب", "جنوب غرب", "غرب", "شمال غرب"];
  return dirs[Math.round(angle / 45) % 8];
}

// ─────────────────────────────────────────────
//  /start
// ─────────────────────────────────────────────

bot.start((ctx) => {
  ctx.reply(
    `بسم الله الرحمن الرحيم\n\nمرحباً بك في بوت تذكير\n\nاختر القسم الذي تريد:`,
    { reply_markup: MAIN_MENU }
  );
});

// ─────────────────────────────────────────────
//  CALLBACK HANDLERS
// ─────────────────────────────────────────────

bot.action("main_menu", (ctx) => {
  ctx.editMessageText(
    `لوحة التحكم الرئيسية\n\nاختر القسم:`,
    { reply_markup: MAIN_MENU }
  );
});

// ── FAMILY ──────────────────────────────────

bot.action("menu_family", (ctx) => {
  const u = getUser(ctx.chat.id);
  const done = u.family.tasks.filter((t) => t.done).length;
  ctx.editMessageText(
    `مفكرة بر الوالدين وصلة الرحم\n\nالاسبوع الحالي\n${familyProgress(u.family.tasks)}\n\nاضغط على الالتزام بعد ادائه:`,
    { reply_markup: familyKeyboard(u.family.tasks) }
  );
});

bot.action(/^family_toggle_(.+)$/, (ctx) => {
  const id = ctx.match[1];
  const u = getUser(ctx.chat.id);
  const task = u.family.tasks.find((t) => t.id === id);
  if (task) task.done = !task.done;
  const done = u.family.tasks.filter((t) => t.done).length;
  const total = u.family.tasks.length;
  let status = done === total ? "\n\nاحسنت. اتممت جميع التزامات هذا الاسبوع." : "";
  ctx.editMessageText(
    `مفكرة بر الوالدين وصلة الرحم\n\nالاسبوع الحالي\n${familyProgress(u.family.tasks)}${status}\n\nاضغط على الالتزام بعد ادائه:`,
    { reply_markup: familyKeyboard(u.family.tasks) }
  );
});

// ── WIRD ─────────────────────────────────────

bot.action("menu_wird", (ctx) => {
  const u = getUser(ctx.chat.id);
  if (!u.wird.goal) {
    ctx.editMessageText(
      `منظم الاوراد وحفظ القرآن\n\nحدد مقدار وردك اليومي:`,
      { reply_markup: wirdGoalKeyboard() }
    );
  } else {
    showWirdDash(ctx, u);
  }
});

bot.action("wird_change", (ctx) => {
  ctx.editMessageText(
    `منظم الاوراد وحفظ القرآن\n\nحدد مقدار وردك اليومي:`,
    { reply_markup: wirdGoalKeyboard() }
  );
});

bot.action(/^wird_set_(.+)$/, (ctx) => {
  const goal = ctx.match[1];
  const u = getUser(ctx.chat.id);
  u.wird.goal = goal;
  showWirdDash(ctx, u);
});

function showWirdDash(ctx, u) {
  const label = WIRD_LABELS[u.wird.goal] || u.wird.goal;
  const streakText = u.wird.streak > 0
    ? `\nايام الاستمرار: ${u.wird.streak} يوم متتالي`
    : "";
  const statusText = u.wird.todayDone
    ? "\nالحالة: تم انجاز ورد اليوم"
    : "\nالحالة: لم يؤد الورد بعد";

  ctx.editMessageText(
    `منظم الاوراد وحفظ القرآن\n\nوردك اليومي: ${label}${statusText}${streakText}\n\nكل يوم تقرأ ورد يضاف الى سجل استمرارك:`,
    { reply_markup: wirdDashKeyboard(u.wird.todayDone) }
  );
}

bot.action("wird_done", (ctx) => {
  const u = getUser(ctx.chat.id);
  if (!u.wird.todayDone) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().slice(0, 10);
    u.wird.streak = u.wird.lastDone === yKey ? u.wird.streak + 1 : 1;
    u.wird.lastDone = todayKey();
    u.wird.todayDone = true;
  }
  showWirdDash(ctx, u);
});

// ── RIGHTS ───────────────────────────────────

bot.action("menu_rights", (ctx) => {
  ctx.editMessageText(
    `مكتبة الحقوق والواجبات الشرعية\n\naختر الباب:`,
    { reply_markup: rightsKeyboard() }
  );
});

bot.action("rights_parents", (ctx) => {
  ctx.editMessageText(
    RIGHTS_CONTENT.parents,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "رجوع الى المكتبة", callback_data: "menu_rights" }],
          BACK_BTN,
        ],
      },
    }
  );
});

bot.action("rights_neighbor", (ctx) => {
  ctx.editMessageText(RIGHTS_CONTENT.neighbor, {
    reply_markup: { inline_keyboard: [[{ text: "رجوع الى المكتبة", callback_data: "menu_rights" }], BACK_BTN] },
  });
});

bot.action("rights_spouse", (ctx) => {
  ctx.editMessageText(RIGHTS_CONTENT.spouse, {
    reply_markup: { inline_keyboard: [[{ text: "رجوع الى المكتبة", callback_data: "menu_rights" }], BACK_BTN] },
  });
});

bot.action("rights_friends", (ctx) => {
  ctx.editMessageText(RIGHTS_CONTENT.friends, {
    reply_markup: { inline_keyboard: [[{ text: "رجوع الى المكتبة", callback_data: "menu_rights" }], BACK_BTN] },
  });
});

bot.action("rights_finance", (ctx) => {
  ctx.editMessageText(RIGHTS_CONTENT.finance, {
    reply_markup: { inline_keyboard: [[{ text: "رجوع الى المكتبة", callback_data: "menu_rights" }], BACK_BTN] },
  });
});

// ── QIBLA ─────────────────────────────────────

bot.action("menu_qibla", (ctx) => {
  ctx.editMessageText(
    `بوصلة القبلة وتوقيت الصلاة\n\nاضغط الزر ادناه ثم ارسل موقعك من خيار "ارسال الموقع" في تيليغرام:`,
    { reply_markup: qiblaKeyboard() }
  );
});

bot.action("qibla_request", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply(
    `ارسل موقعك الآن باستخدام زر "ارسال الموقع" في تيليغرام.\n\nسيحسب البوت اتجاه القبلة فوراً.`
  );
});

bot.on("location", (ctx) => {
  const { latitude, longitude } = ctx.message.location;
  const angle = calcQibla(latitude, longitude);
  const dir = compassDir(angle);

  ctx.reply(
    `بوصلة القبلة\n\nموقعك: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}\n\nاتجاه القبلة: ${angle} درجة (${dir})\n\nوجه الجانب العلوي من هاتفك نحو ${angle} درجة لمواجهة الكعبة المشرفة.\n\nملاحظة: استخدم بوصلة هاتفك مع هذه الزاوية للدقة التامة.`,
    {
      reply_markup: {
        inline_keyboard: [BACK_BTN],
      },
    }
  );
});

// ── DETOX ─────────────────────────────────────

const DETOX_REFLECTIONS = [
  "تأمل خَلق السماوات والارض وما فيهما من عجائب الصنع الالهي.",
  "تفكر في نعمة الحياة والصحة والعقل، واحمد الله عليها.",
  "تأمل كيف يُدبر الله امر هذا الكون في كل لحظة دون توقف.",
  "تفكر في نعمة الاسلام وكيف هداك الله من بين الملايين.",
  "تأمل في آية الكرسي وعظمة الله الذي لا تاخذه سنة ولا نوم.",
];

bot.action("menu_detox", (ctx) => {
  const u = getUser(ctx.chat.id);
  ctx.editMessageText(
    `لوحة تصفية الذهن والتفكر\n\nتحديات مكتملة: ${u.detox.completed}\n\nاعط عقلك استراحة من الضوضاء الرقمية. عشر دقائق من الصمت والتفكر تعيد صفاء الذهن.`,
    { reply_markup: detoxKeyboard(u.detox.active, u.detox.completed) }
  );
});

bot.action("detox_start", (ctx) => {
  const u = getUser(ctx.chat.id);
  u.detox.active = true;
  u.detox.startedAt = Date.now();

  const reflection = DETOX_REFLECTIONS[Math.floor(Math.random() * DETOX_REFLECTIONS.length)];

  ctx.editMessageText(
    `تحدي الصمت والتفكر - 10 دقائق\n\n${reflection}\n\nاغلق هاتفك الآن وتفكر في هذا بعمق.\n\nعد بعد 10 دقائق واضغط "اكملت التحدي".`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "اكملت التحدي", callback_data: "detox_confirm" }],
          BACK_BTN,
        ],
      },
    }
  );
});

bot.action("detox_confirm", (ctx) => {
  const u = getUser(ctx.chat.id);
  const elapsed = u.detox.startedAt ? (Date.now() - u.detox.startedAt) / 60000 : 10;
  u.detox.active = false;
  u.detox.startedAt = null;
  u.detox.completed += 1;

  const mins = Math.round(elapsed);
  ctx.editMessageText(
    `احسنت\n\nاكملت تحدي التفكر (${mins} دقيقة)\n\nمجموع تحدياتك المكتملة: ${u.detox.completed}\n\n"الا بذكر الله تطمئن القلوب"`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "تحدي جديد", callback_data: "detox_start" }],
          BACK_BTN,
        ],
      },
    }
  );
});

// ─────────────────────────────────────────────
//  LAUNCH
// ─────────────────────────────────────────────

bot.launch().then(() => {
  console.log("Bot tazkeer is running...");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
