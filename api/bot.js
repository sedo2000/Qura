const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

// دالة لاختيار نص التذكير بناءً على يوم الأسبوع
function getReminderText() {
    const day = new Date().getDay(); // 5 هو يوم الجمعة
    if (day === 5) {
        return 'أفضل الأعمال يوم الجمعة الصلاة على محمد وآل محمد.. هل شاركت اليوم ؟';
    }
    return 'هل صليت على محمد وآل محمد اليوم ؟';
}

bot.start(async (ctx) => {
    return await ctx.reply(
        'أهلاً بك في بوت التذكير بالصلاة على محمد وآل محمد.\n\n' +
        'لاستخدام البوت في أي محادثة أو مجموعة، فقط اكتب في حقل الكتابة يوزر البوت متبوعاً بمسافة مثل هذا الشكل:\n\n' +
        `@${ctx.botInfo.username} `
    );
});

bot.on('inline_query', async (ctx) => {
    // البنية الجديدة للزر: الرمز (y)، ثم العداد الابتدائي (0)، ثم علامة (_) لحفظ الـ IDs لاحقاً
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('نعم', 'y_0_'), 
            Markup.button.callback('لا', 'n')
        ]
    ]);

    const dynamicText = getReminderText();

    const results = [
        {
            type: 'article',
            id: 'shala_reminder',
            title: 'تذكير الصلاة على محمد وآل محمد',
            description: 'اضغط هنا لمشاركة التذكير في المحادثة',
            input_message_content: {
                message_text: `${dynamicText}\n\nعدد المصلين حتى الآن: 0`
            },
            reply_markup: keyboard.reply_markup,
            thumbnail_url: 'https://od.lk/s/M18zMjg3OTA3MzRf/16344%20%281%29.png',
            thumbnail_width: 48,
            thumbnail_height: 48
        }
    ];

    return await ctx.answerInlineQuery(results, { cache_time: 0 });
});

// معالجة ضغط زر نعم بالبنية الجديدة المضمونة
bot.action(/^y_(\d+)_(.*)$/, async (ctx) => {
    const userId = ctx.from.id.toString();
    const currentCount = parseInt(ctx.match[1]); // قراءة العداد مباشرة وبأمان من الزر
    const dataString = ctx.match[2]; // قراءة قائمة الـ IDs
    
    let votedUsers = dataString ? dataString.split('.') : [];

    // 1. التحقق من عدم التكرار
    if (votedUsers.includes(userId)) {
        return await ctx.answerCbQuery('لقد قمت بالضغط والمشاركة مسبقاً، بارك الله بك', { show_alert: true });
    }

    // 2. التحقق من مساحة الزر (حدود تليجرام 64 بايت)
    if (encodeURIComponent(dataString + '.' + userId).length > 40) {
        votedUsers = []; // تفريغ المعرفات القديمة عند امتلاء المساحة لضمان استمرار العداد
    }

    votedUsers.push(userId);
    const newCount = currentCount + 1;
    const newDataString = votedUsers.join('.');

    // قراءة الاسم الأول لإرسال التنبيه المخصص
    const firstName = ctx.from.first_name;
    await ctx.answerCbQuery(`بارك الله بك يا ${firstName}`, { show_alert: false });

    // تحديث بيانات الزر بالعداد الجديد والقائمة المحدثة
    const updatedKeyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('نعم', `y_${newCount}_${newDataString}`),
            Markup.button.callback('لا', 'n')
        ]
    ]);

    // الحصول على نص التذكير الحالي وتحديث العداد بأسفله بأمان
    const dynamicText = getReminderText();

    try {
        await ctx.editMessageText(
            `${dynamicText}\n\nعدد المصلين حتى الآن: ${newCount}`,
            { reply_markup: updatedKeyboard.reply_markup }
        );
    } catch (error) {
        console.log('تحديث متزامن سريع');
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
