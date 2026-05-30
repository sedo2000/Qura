const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

// معالجة رسالة الترحيب عند إرسال /start
bot.start(async (ctx) => {
    return await ctx.reply(
        'أهلاً بك في بوت التذكير بالصلاة على محمد وآل محمد.\n\n' +
        'لاستخدام البوت في أي محادثة أو مجموعة، فقط اكتب في حقل الكتابة يوزر البوت متبوعاً بمسافة مثل هذا الشكل:\n\n' +
        `@${ctx.botInfo.username} `
    );
});

// معالجة طلب الـ Inline Mode عند كتابة معرف البوت ومسافة
bot.on('inline_query', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('نعم', 'answered_yes'),
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
                message_text: 'هل صليت على محمد وآل محمد اليوم ؟'
            },
            reply_markup: keyboard.reply_markup,
            
            // تم إدراج رابط صورتك المباشر هنا بنجاح
            thumbnail_url: 'https://od.lk/s/M18zMjg3OTA3MzRf/16344%20%281%29.png',
            thumbnail_width: 48,
            thumbnail_height: 48
        }
    ];

    return await ctx.answerInlineQuery(results, { cache_time: 0 });
});

// التفاعل عند ضغط المستخدم على زر (نعم)
bot.action('answered_yes', async (ctx) => {
    return await ctx.answerCbQuery('بارك الله بيك/چ', { show_alert: true });
});

// التفاعل عند ضغط المستخدم على زر (لا)
bot.action('answered_no', async (ctx) => {
    return await ctx.answerCbQuery('شنو تنتظر ما تصلي/ين ؟', { show_alert: true });
});

// الدالة البرمجية الخاصة ببيئة Vercel
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
