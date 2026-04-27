const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('./')); // Барлық статикалық файлдарды (index.html, т.б.) көрсету үшін


function getAIResponse(question, lang) {
    const q = question.toLowerCase();
    
    const responses = {
        kk: {
            web: "🌐 Web Development курсы: HTML, CSS, JavaScript, React, Node.js. Ұзақтығы: 4-6 ай. Бағасы: 180 000 — 290 000 ₸",
            mobile: "📱 Mobile Development: Flutter, React Native. Ұзақтығы: 4 ай. Бағасы: 220 000 ₸",
            python: "🐍 Python курсы: Backend, Data Science. Ұзақтығы: 3-4 ай. Бағасы: 150 000 — 250 000 ₸",
            ai: "🤖 AI курсы: Machine Learning, Deep Learning. Ұзақтығы: 5 ай. Бағасы: 350 000 ₸",
            price: "💰 Бағалар: Beginner: 120 000-180 000₸, Pro: 250 000-390 000₸. Бөліп төлеу бар.",
            enroll: "📝 Жазылу: +7 (700) 000-00-00 немесе сайттағы форма",
            default: "💡 Бізде курстар: Web, Mobile, Python, Data Science, AI. Қайсысы қызықтырады?"
        },
        ru: {
            web: "🌐 Web Development: HTML, CSS, JavaScript, React, Node.js. Длительность: 4-6 месяцев. Цена: 180 000 — 290 000 ₸",
            mobile: "📱 Mobile Development: Flutter, React Native. Длительность: 4 месяца. Цена: 220 000 ₸",
            python: "🐍 Python курс: Backend, Data Science. Длительность: 3-4 месяца. Цена: 150 000 — 250 000 ₸",
            ai: "🤖 AI курс: Machine Learning, Deep Learning. Длительность: 5 месяцев. Цена: 350 000 ₸",
            price: "💰 Цены: Beginner: 120 000-180 000₸, Pro: 250 000-390 000₸. Рассрочка доступна.",
            enroll: "📝 Запись: +7 (700) 000-00-00 или форма на сайте",
            default: "💡 У нас есть курсы: Web, Mobile, Python, Data Science, AI. Какой вас интересует?"
        },
        en: {
            web: "🌐 Web Development: HTML, CSS, JavaScript, React, Node.js. Duration: 4-6 months. Price: $180-290",
            mobile: "📱 Mobile Development: Flutter, React Native. Duration: 4 months. Price: $220",
            python: "🐍 Python course: Backend, Data Science. Duration: 3-4 months. Price: $150-250",
            ai: "🤖 AI course: Machine Learning, Deep Learning. Duration: 5 months. Price: $350",
            price: "💰 Prices: Beginner: $120-180, Pro: $250-390. Installment plan available.",
            enroll: "📝 Enroll: +7 (700) 000-00-00 or form on website",
            default: "💡 We have courses: Web, Mobile, Python, Data Science, AI. Which one interests you?"
        }
    };
    
    const res = responses[lang] || responses.kk;
    
    if (q.includes('web')) return res.web;
    if (q.includes('mobile') || q.includes('мобиль')) return res.mobile;
    if (q.includes('python')) return res.python;
    if (q.includes('ai') || q.includes('интеллект')) return res.ai;
    if (q.includes('баға') || q.includes('цена') || q.includes('price')) return res.price;
    if (q.includes('жазыл') || q.includes('запис') || q.includes('enroll')) return res.enroll;
    
    return res.default;
}

app.post('/api/chat', async (req, res) => {
    const { message, lang } = req.body;
    const reply = getAIResponse(message, lang);
    res.json({ success: true, reply });
});

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'chat.html'));
});


let db;

// ===== БАЗАНЫ БАСТАУ =====
(async () => {
    try {
        db = await open({
            filename: './database.sqlite',
            driver: sqlite3.Database
        });

        // Пайдаланушылар кестесі
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fullName TEXT,
                phone TEXT,
                email TEXT UNIQUE,
                password TEXT
            )
        `);

        // Тапсырыстар кестесі (ЖАҢА)
        await db.exec(`
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                items TEXT,
                total REAL,
                order_date TEXT,
                user_email TEXT
            )
        `);

        console.log("✅ СӘТТІ: SQLite базасы (Users & Orders) дайын!");
    } catch (err) {
        console.error("Базаны ашуда қате шықты:", err);
    }
})();

// ===== ПАЙДАЛАНУШЫНЫ ТІРКЕУ (API) =====
app.post('/api/register', async (req, res) => {
    const { fullName, phone, email, password } = req.body;
    try {
        await db.run(
            'INSERT INTO users (fullName, phone, email, password) VALUES (?, ?, ?, ?)',
            [fullName, phone, email, password]
        );
        res.status(201).json({ success: true, message: "Пайдаланушы SQLite-қа сақталды!" });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: "Бұл Email бос емес немесе қате болды." });
    }
});

// ===== ТАПСЫРЫСТЫ САҚТАУ (API) =====
app.post('/api/orders', async (req, res) => {
    const { items, total, user_email } = req.body;
    try {
        const order_date = new Date().toLocaleString();
        // items - бұл массив, сондықтан оны текст (string) ретінде сақтаймыз
        await db.run(
            'INSERT INTO orders (items, total, order_date, user_email) VALUES (?, ?, ?, ?)',
            [JSON.stringify(items), total, order_date, user_email || 'Guest']
        );
        res.status(201).json({ success: true, message: "Тапсырыс базаға сәтті жазылды!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Тапсырысты сақтау мүмкін болмады." });
    }
});

// ===== БЕТТЕРДІ БАҒЫТТАУ =====
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html')); // Негізгі магазин беті
});

app.get('/register', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'register.html')); // Тіркелу беті
});

// ===== СЕРВЕРДІ ҚОСУ =====
const PORT = 3000;
app.listen(PORT, () => {
    console.log('-------------------------------------------');
    console.log(`🚀 Сервер қосылды: http://localhost:${PORT}`);
    console.log('-------------------------------------------');
});