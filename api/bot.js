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
    // اختصار البيانات إلى y_0 لتوفير المساحة وضمان عمل الزر فوراً
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('نعم', 'y_0'),
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

// معالجة ضغط زر نعم المختصر بأمان وسرعة
bot.action(/^y_(\d+)$/, async (ctx) => {
    const currentCount = parseInt(ctx.match[1]);
    const newCount = currentCount + 1;

    // إشعار منبثق سريع بدون تجميد
    await ctx.answerCbQuery('بارك الله بيك/چ', { show_alert: false });

    const updatedKeyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('نعم', `y_${newCount}`),
            Markup.button.callback('لا', 'n')
        ]
    ]);

    try {
        await ctx.editMessageText(
            `هل صليت على محمد وآل محمد اليوم ؟\n\nعدد المصلين حتى الآن: ${newCount}`,
            { reply_markup: updatedKeyboard.reply_markup }
        );
    } catch (error) {
        console.log('تحديث متزامن سريع');
    }
});

// معالجة زر لا المختصر
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
