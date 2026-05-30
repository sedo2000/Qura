const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

bot.start(async (ctx) => {
    return await ctx.reply(
        'أهلاً بك في بوت التذكير بالصلاة على محمد وآل محمد.\n\n' +
        'لاستخدام البوت في أي محادثة أو مجموعة، فقط اكتب في حقل الكتابة يوزر البوت متبوعاً بمسافة مثل هذا الشكل:\n\n' +
        `@${ctx.botInfo.username} `
    );
});

bot.on('inline_query', async (ctx) => {
    // الزر يبدأ بقائمة فارغة للمستخدمين الذين ضغطوا نعم
    // سنخزن الـ IDs مفصولة بنقطة بعد حرف الـ y
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('نعم', 'y_'), 
            Markup.button.callback('لا', 'n')
        ]
    ]);

    const results = [
        {
            type: 'article',
            id: 'shala_reminder',
            title: 'هل صليت على محمد وآل محمد اليوم ؟',
            description: 'اضغط هنا لمشاركة التذكير في المحادثة',
            input_message_content: {
                message_text: 'هل صليت على محمد وآل محمد اليوم ؟\n\nعدد المصلين حتى الآن: 0'
            },
            reply_markup: keyboard.reply_markup,
            thumbnail_url: 'https://od.lk/s/M18zMjg3OTA3MzRf/16344%20%281%29.png',
            thumbnail_width: 48,
            thumbnail_height: 48
        }
    ];

    return await ctx.answerInlineQuery(results, { cache_time: 0 });
});

// معالجة ضغط زر نعم والتحقق من الـ ID لمنع التكرار
bot.action(/^y_(.*)$/, async (ctx) => {
    const userId = ctx.from.id.toString();
    const dataString = ctx.match[1]; // سلسلة الـ IDs الحالية المخزنة في الزر
    
    // تحويل السلسلة إلى مصفوفة (Array) لمعرفات المستخدمين
    let votedUsers = dataString ? dataString.split('.') : [];

    // 1. التحقق إذا كان هذا المستخدم قد ضغط على الزر مسبقاً
    if (votedUsers.includes(userId)) {
        return await ctx.answerCbQuery('لقد قمت بالضغط والمشاركة مسبقاً، بارك الله بيك/چ', { show_alert: true });
    }

    // 2. إذا لم يكن قد ضغط، نتحقق من المساحة المتاحة في الزر (حدود تليجرام لبيانات الزر هي 64 بايت)
    // إذا امتدت القائمة واقتربت من الحد الأقصى، نقوم بتصفير المصفوفة في الخلفية للحفاظ على استمرار العداد دون توقف
    if (encodeURIComponent(dataString + '.' + userId).length > 50) {
        votedUsers = []; // تفريغ الـ IDs القديمة مع الاحتفاظ بالعدد الكلي في نص الرسالة
    }

    // إضافة المستخدم الحالي لقائمة الذين ضغطوا
    votedUsers.push(userId);
    const newDataString = votedUsers.join('.');

    // حساب عدد المصلين الحالي من نص الرسالة وزيادته بـ 1
    const messageText = ctx.callbackQuery.message ? ctx.callbackQuery.message.text : '';
    const matchCount = messageText ? messageText.match(/عدد المصلين حتى الآن: (\d+)/) : null;
    const currentCount = matchCount ? parseInt(matchCount[1]) : 0;
    const newCount = currentCount + 1;

    // إشعار التبريك للمستخدم الجديد
    await ctx.answerCbQuery('بارك الله بيك/چ', { show_alert: false });

    // تحديث الأزرار بالقائمة الجديدة
    const updatedKeyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('نعم', `y_${newDataString}`),
            Markup.button.callback('لا', 'n')
        ]
    ]);

    // تعديل الرسالة بالعدد الحقيقي الجديد
    try {
        await ctx.editMessageText(
            `هل صليت على محمد وآل محمد اليوم ؟\n\nعدد المصلين حتى الآن: ${newCount}`,
            { reply_markup: updatedKeyboard.reply_markup }
        );
    } catch (error) {
        console.log('تحديث متزامن');
    }
});

// معالجة زر لا
bot.action('n', async (ctx) => {
    return await ctx.answerCbQuery('شنو تنتظر ما تصلي/ين ؟', { show_alert: true });
});

module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') {
            await bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } else {
            res.status(200).send('السيرفر يعمل بنجاح');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('حدث خطأ');
    }
};
