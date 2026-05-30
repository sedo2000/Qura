const { Telegraf, Markup } = require('telegraf');

// سيتم قراءة التوكن من إعدادات البيئة في فيرسل ليكون آمناً
const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

// 1. التعامل مع وضع الـ Inline Mode
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
            reply_markup: keyboard.reply_markup
        }
    ];

    return await ctx.answerInlineQuery(results, { cache_time: 0 });
});

// 2. التفاعل مع أزرار (نعم / لا)
bot.action('answered_yes', async (ctx) => {
    return await ctx.answerCbQuery('بارك الله بيك/چ', { show_alert: true });
});

bot.action('answered_no', async (ctx) => {
    return await ctx.answerCbQuery('شنو تنتظر ما تصلي/ين ؟', { show_alert: true });
});

// دالة المعالجة الخاصة بـ Vercel لاستقبال طلبات الـ Webhook
module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') {
            await bot.handleUpdate(req.body);
            res.status(200).send('OK');
        } else {
            res.status(200).send('السيرفر يعمل، لكنه ينتظر طلبات POST من تلجرام');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('حدث خطأ داخلي');
    }
};
