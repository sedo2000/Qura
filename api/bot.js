const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// مصفوفة الأسئلة الثقافية الإسلامية
const triviaQuestions = [
    { q: "كم عدد غزوات الرسول التي قاتل فيها بنفسه؟", options: ["9 غزوات", "17 غزوة", "27 غزوة"], ans: 0 },
    { q: "من هو الصحابي الذي لُقب بأمين هذه الأمة؟", options: ["أبو عبيدة بن الجراح", "عمر بن الخطاب", "علي بن أبي طالب"], ans: 0 },
    { q: "ما هي أول عاصمة في تاريخ الإسلام؟", options: ["مكة المكرمة", "المدينة المنورة", "الكوفة"], ans: 1 }
];

// دالة بناء الشاشة الرئيسية للبوت (تشبه واجهة حقيبة المؤمن)
function getMainMenu(streak = 0, theme = 'classic') {
    return Markup.inlineKeyboard([
        [Markup.button.callback('جدول الصلوات والالتزام (الستريك)', `menu:prayers:${streak}:${theme}`)],
        [Markup.button.callback('المسبحة الإلكترونية التفاعلية', 'menu:dhikr:0')],
        [Markup.button.callback('مفكرة السنن الرواتب اليومية', 'menu:sunnah')],
        [Markup.button.callback('حاسبة زكاة المال الفورية', 'menu:zakat:1000')],
        [Markup.button.callback('صندوق الأسئلة والسيرة النبوية', 'menu:trivia')],
        [Markup.button.callback('لوحة قياس المزاج والنصح الروحي', 'menu:mood')],
        [Markup.button.callback('إعدادات ومواقيت الصلاة', 'menu:settings')]
    ]);
}

// الأمر الرئيسي لتشغيل بوت تذكير
bot.command('start', async (ctx) => {
    const welcomeText = "مرحباً بك في بوت تذكير\n\nمساعدك الإسلامي المنظم لجدولة وتتبع العادات العبادية اليومية بأسلوب تفاعلي.";
    await ctx.reply(welcomeText, getMainMenu());
});

// العودة للقائمة الرئيسية من أي مكان
bot.action(/^main:back:(\d+):(.+)$/, async (ctx) => {
    const streak = ctx.match[1];
    const theme = ctx.match[2];
    await ctx.answerCbQuery();
    await ctx.editMessageText("بوت تذكير\n\nاختر القسم الذي تريد تصفحه ومتابعته من اللوحة أدناه:", getMainMenu(streak, theme));
});


// 1️⃣ قسم جدول الصلوات والستريك
bot.action(/^menu:prayers:(\d+):(.+)$/, async (ctx) => {
    const streak = parseInt(ctx.match[1]);
    const theme = ctx.match[2];
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('الفجر', `pray:fajr:${streak}:${theme}`)],
        [Markup.button.callback('الظهر', `pray:dhuhr:${streak}:${theme}`)],
        [Markup.button.callback('العصر', `pray:asr:${streak}:${theme}`)],
        [Markup.button.callback('المغرب', `pray:maghrib:${streak}:${theme}`)],
        [Markup.button.callback('العشاء', `pray:isha:${streak}:${theme}`)],
        [Markup.button.callback('تبديل مظهر الكرت', `theme:toggle:${streak}:${theme}`)],
        [Markup.button.callback('العودة للقائمة الرئيسية', `main:back:${streak}:${theme}`)]
    ]);

    await ctx.editMessageText("قسم تتبع الصلوات اليومية:\n\nاضغط على الصلاة التي قمت بأدائها في وقتها لتحديث كرت الالتزام وزيادة الستريك الخاص بك.", keyboard);
});

bot.action(/^pray:(fajr|dhuhr|asr|maghrib|isha):(\d+):(.+)$/, async (ctx) => {
    const prayerName = ctx.match[1];
    let streak = parseInt(ctx.match[2]) + 1;
    const theme = ctx.match[3];
    const names = { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };

    const replyMarkup = ctx.callbackQuery.message.reply_markup;
    const updatedKeyboard = replyMarkup.inline_keyboard.map(row => {
        return row.map(button => {
            if (button.callback_data.startsWith(`pray:${prayerName}:`)) {
                return { text: `${names[prayerName]} (تم +${streak})`, callback_data: `pray:${prayerName}:${streak}:${theme}` };
            }
            if (button.callback_data.startsWith('theme:toggle:') || button.callback_data.startsWith('main:back:')) {
                const parts = button.callback_data.split(':');
                return { text: button.text, callback_data: `${parts[0]}:${parts[1]}:${streak}:${theme}` };
            }
            return button;
        });
    });

    await ctx.answerCbQuery(`تم تسجيل صلاة ${names[prayerName]}`);
    await ctx.editMessageReplyMarkup({ inline_keyboard: updatedKeyboard });
});

bot.action(/^theme:toggle:(\d+):(.+)$/, async (ctx) => {
    const streak = ctx.match[1];
    const currentTheme = ctx.match[2];
    const nextTheme = currentTheme === 'classic' ? 'neon' : 'classic';

    const replyMarkup = ctx.callbackQuery.message.reply_markup;
    const updatedKeyboard = replyMarkup.inline_keyboard.map(row => {
        return row.map(button => {
            if (button.callback_data.startsWith('theme:toggle:')) {
                return { text: `تبديل مظهر الكرت (${nextTheme === 'neon' ? 'مودرن' : 'كلاسيك'})`, callback_data: `theme:toggle:${streak}:${nextTheme}` };
            }
            if (button.callback_data.startsWith('pray:')) {
                const parts = button.callback_data.split(':');
                return { text: button.text, callback_data: `pray:${parts[1]}:${parts[2]}:${nextTheme}` };
            }
            if (button.callback_data.startsWith('main:back:')) {
                return { text: button.text, callback_data: `main:back:${streak}:${nextTheme}` };
            }
            return button;
        });
    });

    await ctx.answerCbQuery("تم تغيير مظهر كرت الستريك");
    await ctx.editMessageReplyMarkup({ inline_keyboard: updatedKeyboard });
});


// 2️⃣ قسم المسبحة الإلكترونية التفاعلية
bot.action(/^menu:dhikr:(\d+)$/, async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('سبحان الله (0)', 'dhikr:subhan:0')],
        [Markup.button.callback('الحمد لله (0)', 'dhikr:hamd:0')],
        [Markup.button.callback('الله أكبر (0)', 'dhikr:allah:0')],
        [Markup.button.callback('العودة للقائمة الرئيسية', 'main:back:0:classic')]
    ]);
    await ctx.editMessageText("المسبحة الإلكترونية الرقمية:\n\nاضغط على الأذكار لبدء الحساب التراكمي الفوري.", keyboard);
});

bot.action(/^dhikr:(subhan|hamd|allah):(\d+)$/, async (ctx) => {
    const type = ctx.match[1];
    let count = parseInt(ctx.match[2]) + 1;
    const names = { subhan: 'سبحان الله', hamd: 'الحمد لله', allah: 'الله أكبر' };

    if (count === 33) {
        await ctx.answerCbQuery(`أكملت 33 مرة من ${names[type]}`, { show_alert: true });
    } else {
        await ctx.answerCbQuery(`العداد: ${count}`);
    }

    const replyMarkup = ctx.callbackQuery.message.reply_markup;
    const updatedKeyboard = replyMarkup.inline_keyboard.map(row => {
        return row.map(button => {
            if (button.callback_data.startsWith(`` + `dhikr:${type}:`)) {
                return { text: `${names[type]} (${count})`, callback_data: `dhikr:${type}:${count}` };
            }
            return button;
        });
    });
    await ctx.editMessageReplyMarkup({ inline_keyboard: updatedKeyboard });
});


// 3️⃣ قسم السنن الرواتب
bot.action('menu:sunnah', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('قبلية الفجر (ركعتان)', 'sun:fajr')],
        [Markup.button.callback('قبلية الظهر (4 ركعات)', 'sun:dhuhr_b')],
        [Markup.button.callback('بعدية الظهر (ركعتان)', 'sun:dhuhr_a')],
        [Markup.button.callback('بعدية المغرب (ركعتان)', 'sun:maghrib')],
        [Markup.button.callback('بعدية العشاء (ركعتان)', 'sun:isha')],
        [Markup.button.callback('العودة للقائمة الرئيسية', 'main:back:0:classic')]
    ]);
    await ctx.editMessageText("مفكرة السنن الرواتب والنوافل:\n\nاضغط على السنة التي أديتها لتوثيقها في جدولك اليومي.", keyboard);
});

bot.action(/^sun:(fajr|dhuhr_b|dhuhr_a|maghrib|isha)$/, async (ctx) => {
    const type = ctx.match[1];
    const replyMarkup = ctx.callbackQuery.message.reply_markup;
    const updatedKeyboard = replyMarkup.inline_keyboard.map(row => {
        return row.map(button => {
            if (button.callback_data === `sun:${type}`) {
                return { text: `${button.text} (تم إنجازها)`, callback_data: 'sun:done' };
            }
            return button;
        });
    });
    await ctx.answerCbQuery("تم توثيق السنة الرواتب بنجاح");
    await ctx.editMessageReplyMarkup({ inline_keyboard: updatedKeyboard });
});


// 4️⃣ قسم حاسبة زكاة المال الواجبة
bot.action(/^menu:zakat:(\d+)$/, async (ctx) => {
    const currentMoney = parseInt(ctx.match[1]);
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('+ 1,000', `zk:add:${currentMoney}:1000`), Markup.button.callback('+ 10,000', `zk:add:${currentMoney}:10000`)],
        [Markup.button.callback('- 1,000', `zk:add:${currentMoney}:-1000`), Markup.button.callback('تصفير الرقم', `zk:add:0:0`)],
        [Markup.button.callback('احسب مقدار الزكاة الواجبة طردياً', `zk:calc:${currentMoney}`)],
        [Markup.button.callback('العودة للقائمة الرئيسية', 'main:back:0:classic')]
    ]);
    await ctx.editMessageText(`حاسبة الزكاة الرقمية السريعة:\n\nالمبلغ الحالي المراد جرد زكاته: ${currentMoney}`, keyboard);
});

bot.action(/^zk:add:(\d+):(-?\d+)$/, async (ctx) => {
    let money = parseInt(ctx.match[1]);
    const add = parseInt(ctx.match[2]);
    money = Math.max(0, money + add);

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('+ 1,000', `zk:add:${money}:1000`), Markup.button.callback('+ 10,000', `zk:add:${money}:10000`)],
        [Markup.button.callback('- 1,000', `zk:add:${money}:-1000`), Markup.button.callback('تصفير الرقم', `zk:add:0:0`)],
        [Markup.button.callback('احسب مقدار الزكاة الواجبة طردياً', `zk:calc:${money}`)],
        [Markup.button.callback('العودة للقائمة الرئيسية', 'main:back:0:classic')]
    ]);
    await ctx.editMessageText(`حاسبة الزكاة الرقمية السريعة:\n\nالمبلغ الحالي المراد جرد زكاته: ${money}`, keyboard);
});

bot.action(/^zk:calc:(\d+)$/, async (ctx) => {
    const finalMoney = parseInt(ctx.match[1]);
    const result = finalMoney * 0.025; // نسبة 2.5% الشرعية
    await ctx.answerCbQuery(`مقدار الزكاة المستحق إخراجها هو: ${result}`, { show_alert: true });
});


// 5️⃣ قسم الأسئلة والسيرة النبوية
bot.action('menu:trivia', async (ctx) => {
    const randomIdx = Math.floor(Math.random() * triviaQuestions.length);
    const item = triviaQuestions[randomIdx];

    const buttons = item.options.map((opt, idx) => {
        return [Markup.button.callback(opt, `trv:ans:${randomIdx}:${idx}`)];
    });
    buttons.push([Markup.button.callback('العودة للقائمة الرئيسية', 'main:back:0:classic')]);

    await ctx.editMessageText(`قسم الثقافة الإسلامية والسيرة النبوية:\n\n${item.q}`, Markup.inlineKeyboard(buttons));
});

bot.action(/^trv:ans:(\d+):(\d+)$/, async (ctx) => {
    const qIdx = parseInt(ctx.match[1]);
    const uAns = parseInt(ctx.match[2]);
    const item = triviaQuestions[qIdx];

    if (uAns === item.ans) {
        await ctx.answerCbQuery('إجابة صحيحة وممتازة تماماً', { show_alert: true });
    } else {
        await ctx.answerCbQuery(`إجابة خاطئة، الصحيح هو: ${item.options[item.ans]}`, { show_alert: true });
    }
});


// 6️⃣ قسم قياس المزاج والنصح الروحي
bot.action('menu:mood', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('أشعر بضيق أو قلق نفسي', 'mood:get:sad')],
        [Markup.button.callback('أشعر بالحمد والاستقرار الروحي', 'mood:get:happy')],
        [Markup.button.callback('أشعر بكسل وخمول عن الطاعات', 'mood:get:lazy')],
        [Markup.button.callback('العودة للقائمة الرئيسية', 'main:back:0:classic')]
    ]);
    await ctx.editMessageText("بوابة قياس الاستقرار الروحي:\n\nكيف تجد حالتك النفسية الآن؟ اختر لتلقي التوجيه المناسب.", keyboard);
});

bot.action(/^mood:get:(sad|happy|lazy)$/, async (ctx) => {
    const state = ctx.match[1];
    let res = '';

    if (state === 'sad') res = 'يقول الله تعالى: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ". ننصحك بقراءة سورة الشرح وتدبر معانيها الآن.';
    if (state === 'happy') res = 'الحمد لله دائماً! يقول الله: "لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ". حافظ على هذا الشعور بسجدة شكر أو صدقة خفيفة.';
    if (state === 'lazy') res = 'ردد الآن: "اللهم إني أعوذ بك من الهم والحزن، والعجز والكسل"، وقم بتجديد وضوئك ونشاطك.';

    await ctx.answerCbQuery();
    await ctx.reply(res);
});


// 7️⃣ قسم الإعدادات العامة للمواقيت
bot.action('menu:settings', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('طريقة الحساب: تقويم أم القرى', 'cfg:method:um')],
        [Markup.button.callback('التنبيهات الفورية: تفعيل', 'cfg:notif:on')],
        [Markup.button.callback('العودة للقائمة الرئيسية', 'main:back:0:classic')]
    ]);
    await ctx.editMessageText("إعدادات وتخصيص تطبيق تذكير الرقمي:", keyboard);
});

bot.action(/^cfg:(method|notif):(.+)$/, async (ctx) => {
    const type = ctx.match[1];
    const val = ctx.match[2];
    let nText = '', nData = '';

    if (type === 'method') {
        nText = val === 'um' ? 'طريقة الحساب: المساحة المصرية' : 'طريقة الحساب: تقويم أم القرى';
        nData = val === 'um' ? 'cfg:method:eg' : 'cfg:method:um';
    } else {
        nText = val === 'on' ? 'التنبيهات الفورية: كتم' : 'التنبيهات الفورية: تفعيل';
        nData = val === 'on' ? 'cfg:notif:off' : 'cfg:notif:on';
    }

    const replyMarkup = ctx.callbackQuery.message.reply_markup;
    const updatedKeyboard = replyMarkup.inline_keyboard.map(row => {
        return row.map(button => {
            if (button.callback_data.startsWith(`cfg:${type}:`)) {
                return { text: nText, callback_data: nData };
            }
            return button;
        });
    });

    await ctx.answerCbQuery("تم تحديث خيارات التفضيل");
    await ctx.editMessageReplyMarkup({ inline_keyboard: updatedKeyboard });
});


// تصدير واجهة الويب هوك للرفع المباشر على Vercel
module.exports = async (req, res) => {
    if (req.method === 'POST') {
        await bot.handleUpdate(req.body);
        res.status(200).send('OK');
    } else {
        res.status(200).send('بوت تذكير المنظم يعمل بأعلى كفاءة لبيئة Serverless!');
    }
};
