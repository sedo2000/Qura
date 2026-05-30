const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// 1️⃣ الميزة الأولى: إرسال كرت الصلاة اليومي مع نظام الستريك (Streak)
bot.command('prayers', async (ctx) => {
    // الستريك الابتدائي = 0
    const initialStreak = 0;
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('الفجر 🛑', `pray:fajr:${initialStreak}`)],
        [Markup.button.callback('الظهر 🛑', `pray:dhuhr:${initialStreak}`)],
        [Markup.button.callback('العصر 🛑', `pray:asr:${initialStreak}`)],
        [Markup.button.callback('المغرب 🛑', `pray:maghrib:${initialStreak}`)],
        [Markup.button.callback('العشاء 🛑', `pray:isha:${initialStreak}`)]
    ]);

    await ctx.reply('جدول الصلوات اليومي ومتابعة الالتزام:\n\nاضغط على الصلاة التي أديتها في وقتها لزيادة الستريك الخاص بك 🔥', keyboard);
});

// معالجة ضغطات أزرار الصلوات والـ Streak
bot.action(/^pray:(fajr|dhuhr|asr|maghrib|isha):(\d+)$/, async (ctx) => {
    const prayerName = ctx.match[1];
    let currentStreak = parseInt(ctx.match[2]);
    
    // زيادة الستريك عند الالتزام بالصلاة
    currentStreak += 1;

    // إعادة بناء الأزرار وتحديث قيمة الـ Streak في الـ Callback Data للزر القادم
    const replyMarkup = ctx.callbackQuery.message.reply_markup;
    
    // تحديث الزر الذي تم ضغطه فقط وتحويل حالته إلى (تم ✅)
    const updatedInlineKeyboard = replyMarkup.inline_keyboard.map(row => {
        return row.map(button => {
            if (button.callback_data.startsWith(`pray:${prayerName}:`)) {
                const namesArabic = { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };
                return {
                    text: `${namesArabic[prayerName]} ✅ (+${currentStreak} 🔥)`,
                    callback_data: `pray:${prayerName}:${currentStreak}`
                };
            }
            return button;
        });
    });

    await ctx.answerCbQuery(`عاش! تم تسجيل الصلاة وزيادة الستريك إلى ${currentStreak} 🔥`);
    await ctx.editMessageReplyMarkup({ inline_keyboard: updatedInlineKeyboard });
});


// 2️⃣ الميزة الثانية: عداد الأذكار والتسابيح التراكمية الفورية
bot.command('dhikr', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('سبحان الله (0)', 'dhikr:subhan:0')],
        [Markup.button.callback('الحمد لله (0)', 'dhikr:hamd:0')],
        [Markup.button.callback('الله أكبر (0)', 'dhikr:allah:0')]
    ]);

    await ctx.reply('مسبحة الأذكار التفاعلية الالكترونية:\n\nاضغط على الذكر لتحديث العداد فوراً حياً من الهاتف', keyboard);
});

// معالجة ضغطات عداد الأذكار التراكمي
bot.action(/^dhikr:(subhan|hamd|allah):(\d+)$/, async (ctx) => {
    const type = ctx.match[1];
    let count = parseInt(ctx.match[2]);
    
    count += 1;

    const names = { subhan: 'سبحان الله', hamd: 'الحمد لله', allah: 'الله أكبر' };
    
    // إذا وصل المستخدم للعدد الافتراضي للتسبيح
    if (count === 33) {
        await ctx.answerCbQuery(`تقبل الله طاعتك! أكملت 33 مرة من ${names[type]} ✨`, { show_alert: true });
    } else {
        await ctx.answerCbQuery(`تم التسبيح: ${count}`);
    }

    const replyMarkup = ctx.callbackQuery.message.reply_markup;
    const updatedInlineKeyboard = replyMarkup.inline_keyboard.map(row => {
        return row.map(button => {
            if (button.callback_data.startsWith(`dhikr:${type}:`)) {
                return {
                    text: `${names[type]} (${count})`,
                    callback_data: `dhikr:${type}:${count}`
                };
            }
            return button;
        });
    });

    await ctx.editMessageReplyMarkup({ inline_keyboard: updatedInlineKeyboard });
});


// 3️⃣ الميزة الثالثة: واجهة الإعدادات المصغرة السريعة (تغيير طرق الحساب)
bot.command('settings', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('طريقة الحساب: أم القرى 🕋', 'set:method:um_alqura')],
        [Markup.button.callback('التنبيهات: تفعيل 🔔', 'set:notif:on')],
        [Markup.button.callback('إغلاق الإعدادات ❌', 'set:close')]
    ]);

    await ctx.reply('إعدادات مواقيت الصلاة والاقامة العصرية:', keyboard);
});

// معالجة أزرار الإعدادات السريعة
bot.action(/^set:(method|notif):(.+)$/, async (ctx) => {
    const settingType = ctx.match[1];
    const value = ctx.match[2];

    let newText = '';
    let newData = '';

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

    await ctx.answerCbQuery('تم تحديث التفضيلات فوراً');
    await ctx.editMessageReplyMarkup({ inline_keyboard: updatedInlineKeyboard });
});

bot.action('set:close', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
});

// تصدير الدالة للعمل كـ Serverless Function على Vercel
module.exports = async (req, res) => {
    if (req.method === 'POST') {
        await bot.handleUpdate(req.body);
        res.status(200).send('OK');
    } else {
        res.status(200).send('البوت يعمل بنجاح كبيئة Serverless!');
    }
};
