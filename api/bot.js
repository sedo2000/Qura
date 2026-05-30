const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// مصفوفة محاكاة لأسئلة السيرة (تشتغل مباشرة من الذاكرة لخفة السيرفر)
const triviaQuestions = [
    { q: "كم عدد غزوات الرسول ﷺ التي قاتل فيها بنفسه؟", options: ["9 غزوات", "17 غزوة", "27 غزوة"], ans: 0 },
    { q: "من هو الصحابي الذي لُقب بأمين هذه الأمة؟", options: ["أبو عبيدة بن الجراح", "عمر بن الخطاب", "علي بن أبي طالب"], ans: 0 },
    { q: "ما هي أول عاصمة في تاريخ الإسلام؟", options: ["مكة المكرمة", "المدينة المنورة", "الكوفة"], ans: 1 }
];

// 1️⃣ الميزة الأساسية: جدول الصلوات ونظام الستريك (الـ Streak) مع اختيار المظهر
bot.command('prayers', async (ctx) => {
    const initialStreak = 0;
    const currentTheme = 'classic'; // المظهر الافتراضي
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('الفجر 🛑', `pray:fajr:${initialStreak}:${currentTheme}`)],
        [Markup.button.callback('الظهر 🛑', `pray:dhuhr:${initialStreak}:${currentTheme}`)],
        [Markup.button.callback('العصر 🛑', `pray:asr:${initialStreak}:${currentTheme}`)],
        [Markup.button.callback('المغرب 🛑', `pray:maghrib:${initialStreak}:${currentTheme}`)],
        [Markup.button.callback('العشاء 🛑', `pray:isha:${initialStreak}:${currentTheme}`)],
        [Markup.button.callback('تغيير مظهر الكرت 🎨', `theme:toggle:${initialStreak}:${currentTheme}`)]
    ]);

    await ctx.reply('جدول الصلوات اليومي ومتابعة الالتزام:\n\nاضغط على الصلاة التي أديتها في وقتها لزيادة الستريك الخاص بك 🔥', keyboard);
});

// معالجة الستريك وتغيير الثيمات
bot.action(/^pray:(fajr|dhuhr|asr|maghrib|isha):(\d+):(.+)$/, async (ctx) => {
    const prayerName = ctx.match[1];
    let currentStreak = parseInt(ctx.match[2]);
    const theme = ctx.match[3];
    
    currentStreak += 1;
    const namesArabic = { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };
    const fireEmoji = theme === 'neon' ? '⚡' : '🔥';

    const replyMarkup = ctx.callbackQuery.message.reply_markup;
    const updatedInlineKeyboard = replyMarkup.inline_keyboard.map(row => {
        return row.map(button => {
            if (button.callback_data.startsWith(`pray:${prayerName}:`)) {
                return {
                    text: `${namesArabic[prayerName]} ✅ (+${currentStreak} ${fireEmoji})`,
                    callback_data: `pray:${prayerName}:${currentStreak}:${theme}`
                };
            }
            // تحديث بيانات زر الثيم لكي لا يصفر الستريك الحالي عند الضغط عليه
            if (button.callback_data.startsWith('theme:toggle:')) {
                return { text: button.text, callback_data: `theme:toggle:${currentStreak}:${theme}` };
            }
            return button;
        });
    });

    await ctx.answerCbQuery(`تقبل الله! تم تسجيل صلاة ${namesArabic[prayerName]} والستريك الحالي: ${currentStreak}`);
    await ctx.editMessageReplyMarkup({ inline_keyboard: updatedInlineKeyboard });
});

// ميزة "تبديل خلفية ومظهر الكرت"
bot.action(/^theme:toggle:(\d+):(.+)$/, async (ctx) => {
    const streak = ctx.match[1];
    const currentTheme = ctx.match[2];
    const nextTheme = currentTheme === 'classic' ? 'neon' : 'classic';
    const themeText = nextTheme === 'neon' ? 'المظهر: النيون العصري ⚡' : 'المظهر: الكلاسيكي الهادئ 🌿';

    const replyMarkup = ctx.callbackQuery.message.reply_markup;
    const updatedInlineKeyboard = replyMarkup.inline_keyboard.map(row => {
        return row.map(button => {
            if (button.callback_data.startsWith('theme:toggle:')) {
                return { text: `تغيير مظهر الكرت 🎨 (${nextTheme === 'neon' ? 'مودرن' : 'كلاسيك'})`, callback_data: `theme:toggle:${streak}:${nextTheme}` };
            }
            // تحديث روابط الصلوات لتقرأ الثيم الجديد
            if (button.callback_data.startsWith('pray:')) {
                const parts = button.callback_data.split(':');
                return { text: button.text, callback_data: `pray:${parts[1]}:${parts[2]}:${nextTheme}` };
            }
            return button;
        });
    });

    await ctx.answerCbQuery(`تم تحويل الكرت إلى ${themeText}`);
    await ctx.editMessageReplyMarkup({ inline_keyboard: updatedInlineKeyboard });
});


// 2️⃣ ميزة: السنن الرواتب التابعة للصلوات
bot.command('sunnah', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('قبلية الفجر (ركعتان) 🛑', 'sunnah:fajr:0')],
        [Markup.button.callback('قبلية الظهر (4 ركعات) 🛑', 'sunnah:dhuhr_b:0')],
        [Markup.button.callback('بعدية الظهر (ركعتان) 🛑', 'sunnah:dhuhr_a:0')],
        [Markup.button.callback('بعدية المغرب (ركعتان) 🛑', 'sunnah:maghrib:0')],
        [Markup.button.callback('بعدية العشاء (ركعتان) 🛑', 'sunnah:isha:0')]
    ]);
    await ctx.reply('مفكرة السنن الرواتب اليومية:\n\nحافظ على سننك اليومية ودعنا نغلق العداد معاً لنيل بيت في الجنة.', keyboard);
});

bot.action(/^sunnah:(fajr|dhuhr_b|dhuhr_a|maghrib|isha):(\d+)$/, async (ctx) => {
    const type = ctx.match[1];
    const replyMarkup = ctx.callbackQuery.message.reply_markup;
    const updatedInlineKeyboard = replyMarkup.inline_keyboard.map(row => {
        return row.map(button => {
            if (button.callback_data.startsWith(`sunnah:${type}:`)) {
                const cleanText = button.text.replace('🛑', '✅');
                return { text: cleanText, callback_data: `sunnah:${type}:1` };
            }
            return button;
        });
    });
    await ctx.answerCbQuery('تم تسجيل السنة، بوركت جهودك!');
    await ctx.editMessageReplyMarkup({ inline_keyboard: updatedInlineKeyboard });
});


// 3️⃣ ميزة: مسبحة الأذكار التفاعلية الفورية
bot.command('dhikr', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('سبحان الله (0)', 'dhikr:subhan:0')],
        [Markup.button.callback('الحمد لله (0)', 'dhikr:hamd:0')],
        [Markup.button.callback('الله أكبر (0)', 'dhikr:allah:0')]
    ]);
    await ctx.reply('مسبحة الأذكار الإلكترونية الفورية حياً من الهاتف:', keyboard);
});

bot.action(/^dhikr:(subhan|hamd|allah):(\d+)$/, async (ctx) => {
    const type = ctx.match[1];
    let count = parseInt(ctx.match[2]) + 1;
    const names = { subhan: 'سبحان الله', hamd: 'الحمد لله', allah: 'الله أكبر' };

    if (count === 33) {
        await ctx.answerCbQuery(`تمت الـ 33 من ${names[type]}! ✨`, { show_alert: true });
    } else {
        await ctx.answerCbQuery(`التسبيح الحالي: ${count}`);
    }

    const replyMarkup = ctx.callbackQuery.message.reply_markup;
    const updatedInlineKeyboard = replyMarkup.inline_keyboard.map(row => {
        return row.map(button => {
            if (button.callback_data.startsWith(`dhikr:${type}:`)) {
                return { text: `${names[type]} (${count})`, callback_data: `dhikr:${type}:${count}` };
            }
            return button;
        });
    });
    await ctx.editMessageReplyMarkup({ inline_keyboard: updatedInlineKeyboard });
});


// 4️⃣ ميزة: صندوق الأسئلة والسيرة النبوية التفاعلي
bot.command('trivia', async (ctx) => {
    const randomIndex = Math.floor(Math.random() * triviaQuestions.length);
    const item = triviaQuestions[randomIndex];

    const buttons = item.options.map((opt, idx) => {
        return [Markup.button.callback(opt, `trivia:ans:${randomIndex}:${idx}`)];
    });

    await ctx.reply(`سؤال اليوم في السيرة النبوية والثقافة الإسلامية:\n\n${item.q}`, Markup.inlineKeyboard(buttons));
});

bot.action(/^trivia:ans:(\d+):(\d+)$/, async (ctx) => {
    const qIdx = parseInt(ctx.match[1]);
    const uAns = parseInt(ctx.match[2]);
    const item = triviaQuestions[qIdx];

    if (uAns === item.ans) {
        await ctx.answerCbQuery('إجابة صحيحة وممتازة! عبقري تقنياً وثقافياً 🌟', { show_alert: true });
    } else {
        await ctx.answerCbQuery(`للأسف إجابة خاطئة! الإجابة الصحيحة هي: ${item.options[item.ans]}`, { show_alert: true });
    }
});


// 5️⃣ ميزة: حاسبة زكاة المال والذهب الفورية (بدون إدخال نصوص معقدة)
bot.command('zakat', async (ctx) => {
    const initialMoney = 1000; // قيمة افتراضية بالدولار أو الدينار للبدء منها
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('+ 1,000', `zakat:add:${initialMoney}:1000`), Markup.button.callback('+ 10,000', `zakat:add:${initialMoney}:10000`)],
        [Markup.button.callback('- 1,000', `zakat:add:${initialMoney}:-1000`), Markup.button.callback('تصفير 🔄', `zakat:add:0:0`)],
        [Markup.button.callback('احسب مقدار الزكاة الواجبة 💰', `zakat:calc:${initialMoney}`)]
    ]);

    await ctx.reply(`الحاسبة الفورية السريعة لزكاة أموالك:\n\nالمبلغ المالي الحالي المراد حساب زكاته: ${initialMoney}`, keyboard);
});

bot.action(/^zakat:add:(\d+):(-?\d+)$/, async (ctx) => {
    let currentMoney = parseInt(ctx.match[1]);
    const amountToAdd = parseInt(ctx.match[2]);
    
    currentMoney = Math.max(0, currentMoney + amountToAdd);

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('+ 1,000', `zakat:add:${currentMoney}:1000`), Markup.button.callback('+ 10,000', `zakat:add:${currentMoney}:10000`)],
        [Markup.button.callback('- 1,000', `zakat:add:${currentMoney}:-1000`), Markup.button.callback('تصفير 🔄', `zakat:add:0:0`)],
        [Markup.button.callback('احسب مقدار الزكاة الواجبة 💰', `zakat:calc:${currentMoney}`)]
    ]);

    await ctx.editMessageText(`الحاسبة الفورية السريعة لزكاة أموالك:\n\nالمبلغ المالي الحالي المراد حساب زكاته: ${currentMoney}`, keyboard);
});

bot.action(/^zakat:calc:(\d+)$/, async (ctx) => {
    const finalMoney = parseInt(ctx.match[1]);
    // نسبة الزكاة الشرعية هي 2.5%
    const zakatAmount = finalMoney * 0.025;

    await ctx.answerCbQuery(`مقدار الزكاة الواجب إخراجها عن هذا المبلغ هو: ${zakatAmount}`, { show_alert: true });
});


// 6️⃣ ميزة: لوحة قياس المزاج النفسي والروحي (توجيه النصح الفوري)
bot.command('mood', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('أشعر بضيق أو قلق 😔', 'mood:action:sad')],
        [Markup.button.callback('أشعر بالحمد والاستقرار 😊', 'mood:action:happy')],
        [Markup.button.callback('أشعر بكسل وخمول 😴', 'mood:action:lazy')]
    ]);
    await ctx.reply('كيف تجد حالتك النفسية والروحية الآن؟\nاختر حالتك لتلقي جرعة الدعم المناسبة:', keyboard);
});

bot.action(/^mood:action:(sad|happy|lazy)$/, async (ctx) => {
    const state = ctx.match[1];
    let responseText = '';

    if (state === 'sad') {
        responseText = 'يقول الله تعالى: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ". ننصحك بقراءة سورة الشرح الآن والتدبر فيها.';
    } else if (state === 'happy') {
        responseText = 'الحمد لله دائماً وأبداً! يقول الله: "لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ". حافظ على هذا الشعور بسجدة شكر أو صدقة خفيفة.';
    } else if (state === 'lazy') {
        responseText = 'استعذ بالله من العجز والكسل. ردد الآن: "اللهم إني أعوذ بك من الهم والحزن، والعجز والكسل"، وقم لتجديد وضوئك.';
    }

    await ctx.answerCbQuery();
    await ctx.reply(responseText);
});


// 7️⃣ ميزة: واجهة الإعدادات والتحكم العامة
bot.command('settings', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('طريقة الحساب: أم القرى 🕋', 'set:method:um_alqura')],
        [Markup.button.callback('التنبيهات: تفعيل 🔔', 'set:notif:on')]
    ]);
    await ctx.reply('إعدادات وتخصيص البوت الخدمي بالكامل:', keyboard);
});

bot.action(/^set:(method|notif):(.+)$/, async (ctx) => {
    const settingType = ctx.match[1];
    const value = ctx.match[2];
    let newText = '', newData = '';

    if (settingType === 'method') {
        newText = value === 'um_alqura' ? 'طريقة الحساب: المساحة المصرية 🇪🇬' : 'طريقة الحساب: أم القرى 🕋';
        newData = value === 'um_alqura' ? 'set:method:egypt' : 'set:method:um_alqura';
    } else if (settingType === 'notif') {
        newText = value === 'on' ? 'التنبيهات: كتم 🔕' : 'التنبيهات: تفعيل 🔔';
        newData = value === 'on' ? 'set:notif:off' : 'set:notif:on';
    }

    const replyMarkup = ctx.callbackQuery.message.reply_markup;
    const updatedInlineKeyboard = replyMarkup.inline_keyboard.map(row => {
        return row.map(button => {
            if (button.callback_data.startsWith(`set:${settingType}:`)) {
                return { text: newText, callback_data: newData };
            }
            return button;
        });
    });

    await ctx.answerCbQuery('تم الحفظ والتطبيق فورا');
    await ctx.editMessageReplyMarkup({ inline_keyboard: updatedInlineKeyboard });
});


// تشغيل الـ Webhook متوافق تماماً مع Vercel
module.exports = async (req, res) => {
    if (req.method === 'POST') {
        await bot.handleUpdate(req.body);
        res.status(200).send('OK');
    } else {
        res.status(200).send('البوت الخارق يعمل ومستعد للملايين على فيرسل!');
    }
};
