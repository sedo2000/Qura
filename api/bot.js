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
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('نعم', 'answered_yes_0'), // نبدأ العداد من الرقم 0
            Markup.button.callback('لا', 'answered_no')
        ]
    ]);

    const results = [
        {
            type: 'article',
            id: 'shala_reminder',
            title: 'هل صليت على محمد وآل محمد اليوم ؟',
            description: 'اضغط هنا لمشاركة التذكير في المحادثة',
            input_message_content: {
                // النص الافتراضي للرسالة قبل الضغط على الأزرار
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

// التفاعل الذكي عند ضغط زر (نعم) لتحديث العداد
bot.action(/^answered_yes_(\d+)$/, async (ctx) => {
    // استخراج العدد الحالي من بيانات الزر
    const currentCount = parseInt(ctx.match[1]);
    const newCount = currentCount + 1;

    // إرسال الإشعار المنبثق للمستخدم
    await ctx.answerCbQuery('بارك الله بيك/چ', { show_alert: false });

    // تحديث الأزرار لتخزين الرقم الجديد في الخلفية
    const updatedKeyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('نعم', `answered_yes_${newCount}`),
            Markup.button.callback('لا', 'answered_no')
        ]
    ]);

    // تعديل نص الرسالة في المجموعات ليظهر الرقم الجديد فوراً
    try {
        await ctx.editMessageText(
            `هل صليت على محمد وآل محمد اليوم ؟\n\nعدد المصلين حتى الآن: ${newCount}`,
            { reply_markup: updatedKeyboard.reply_markup }
        );
    } catch (error) {
        // لتجنب توقف البوت في حال ضغط مستخدمان في نفس الإجزاء من الثانية
        console.log('حدث تضارب أثناء التحديث المتزامن');
    }
});

bot.action('answered_no', async (ctx) => {
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
        res.status(500).send('حدث خطأ داخلي');
    }
};
