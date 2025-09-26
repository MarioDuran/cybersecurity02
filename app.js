// app.js
const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose(); 
const app = express();
const PORT = process.env.PORT || 10000;

const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)");
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", ["root", "some_very_secret_password_that_wont_be_used"]);
    console.log('Base de datos SQLite inicializada con el usuario "root".');
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'change-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60,
        },
    })
);


app.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/granted');
    res.send(`
    <!doctype html>
    <html>
    <head>
    <meta charset="utf-8"/>
    <title>Login — root</title>
    <meta name="viewport" content="width=device-width,initial-scale-1"/>
    <style>
    :root { --bg: #000; --panel: rgba(0,0,0,0.6); --glow: #00ff7f; --muted:#888; }
    html,body{height:100%;margin:0;background:var(--bg);font-family:"Courier New",monospace;color:var(--glow)}
    .wrap{height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;
    background-image: radial-gradient(circle at 10% 10%, rgba(0,255,127,0.035), transparent 10%),
    linear-gradient(180deg, rgba(0,0,0,0.02), transparent 40%);}
    .console{width:480px;max-width:94%;padding:32px;background:var(--panel);border:1px solid rgba(0,255,127,0.08);
    box-shadow:0 0 40px rgba(0,255,127,0.04),inset 0 0 1px rgba(255,255,255,0.02);border-radius:10px;transition: transform 150ms ease;}
    h1{margin:0 0 12px 0;font-size:22px;letter-spacing:1px;color:var(--glow);text-align:left}
    label{display:block;margin-bottom:8px;font-size:13px;color:var(--muted);text-align:left}
    .input{width:100%;padding:12px 14px;margin-top:6px;background:transparent;border:1px solid rgba(0,255,127,0.12);
    color:var(--glow);border-radius:6px;outline:none;box-sizing:border-box;font-size:14px;text-shadow:0 0 6px rgba(0,255,127,0.06)}
    .row{margin-bottom:14px}
    .btn{width:100%;padding:12px;border-radius:6px;border:1px solid rgba(0,255,127,0.18);
    background:linear-gradient(90deg, rgba(0,255,127,0.12), rgba(0,255,127,0.06));
    color:var(--glow);font-weight:700;letter-spacing:1px;cursor:pointer;font-size:14px}
    .note{margin-top:12px;font-size:12px;color:var(--muted);text-align:left}
    .fake-terminal{font-size:12px;color:#0f0;opacity:0.85;margin-top:14px;white-space:pre-wrap;background:rgba(0,0,0,0.2);padding:8px;border-radius:4px}
    .error{margin-top:10px;color:#ff6b6b;font-size:13px;min-height:18px}
    @keyframes shake {0%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}100%{transform:translateX(0)}}
    .shake{animation:shake 320ms cubic-bezier(.36,.07,.19,.97)}
    .btn:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,255,127,0.03)}
    </style>
    </head>
    <body>
    <div class="wrap">
    <div class="console" id="panel" role="main" aria-labelledby="title">
    <h1 id="title">AUTH — ROOT</h1>
    <form id="loginForm" autocomplete="on">
    <div class="row">
    <label>Username</label>
    <input class="input" id="username" name="username" placeholder="root" required value="root" />
    </div>
    <div class="row">
    <label>Password</label>
    <input class="input" id="password" name="password" type="password" placeholder="password" />
    </div>
    <button class="btn" type="submit">SIGN IN</button>
    </form>
    <div class="error" id="errorMsg" aria-live="polite"></div>
    <div class="fake-terminal" id="terminal">
    $ /* breadcrumb: Backend and DBA are new hires */ 
    </div>
    <script>
    (function () {
    const form = document.getElementById('loginForm');
    const errorMsg = document.getElementById('errorMsg');
    const panel = document.getElementById('panel');
    form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';
    panel.classList.remove('shake');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    try {
    const resp = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
    });
    if (resp.ok) {
        window.location = '/granted';
        return;
    }
    // Mostrar mensaje de error personalizado del servidor
    let text = 'Incorrect password';
    try {
        const js = await resp.json();
        if (js && js.msg) text = js.msg;
    } catch (err) {}
    errorMsg.textContent = text;
    panel.classList.add('shake');
    } catch (err) {
    errorMsg.textContent = 'Connection error';
    panel.classList.add('shake');
    }
    });
    })();
    </script>
    </div>
    </div>
    </body>
    </html>
    `);
});

app.post('/login', (req, res) => {
    const { username, password = '' } = req.body || {};
    console.log(`[LOG] Intento de login - Usuario: "${username}", Contraseña: "${password}"`);

    if (password === 'rootpass') {
        return res.status(401).json({
            ok: false,
            msg: "Haha! predictable, but nostalgia won’t win you anything today."
        });
    }

    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

    console.log(`Ejecutando consulta vulnerable: ${query}`);

    db.get(query, (err, row) => {
        if (err) {
            return res.status(500).json({ ok: false, msg: 'Error en el servidor.' });
        }
        
        if (row) {
            req.session.user = { username: row.username };
            res.json({ ok: true });
        } else {
            res.status(401).json({ ok: false, msg: 'Incorrect password' });
        }
    });
});

function requireAuth(req, res, next) {
    if (req.session && req.session.user) return next();
    return res.redirect('/');
}

app.get('/granted', requireAuth, (req, res) => {
    const safeUser = String(req.session.user.username).replace(/[^a-zA-Z0-9_-]/g, '');
    const VISIBLE_CODE = 'B7H1-K3LM-XD92-5QT8';
    const HIDDEN_CODE = 'B7HI-K3LM-XD92-5QT8';

    res.send(`
    <!doctype html>
    <html>
    <head>
    <meta charset="utf-8"/>
    <title>ACCESS GRANTED</title>
    <meta name="viewport" content="width=device-width,initial-scale-1"/>
    <style>
    :root{--bg:#000;--glow:#00ff7f;--muted:#888}
    html,body{height:100%;margin:0;background:var(--bg);font-family:"Courier New",monospace;color:var(--glow)}
    .wrap{height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column}
    .panel{padding:40px;background:rgba(0,0,0,0.6);border-radius:10px;border:1px solid rgba(0,255,127,0.08);text-align:center;min-width:320px}
    h1{font-size:28px;margin:0 0 8px 0;letter-spacing:2px}
    p{margin:0 0 14px 0;color:var(--muted)}
    .btn{padding:10px 14px;border-radius:6px;border:1px solid rgba(0,255,127,0.18);background:transparent;color:var(--glow);cursor:pointer}
    .access-code { 
        margin-top:18px; padding:14px 20px; border-radius:8px; font-weight:700; letter-spacing:2px;
        border:1px solid rgba(0,255,127,0.12); background:rgba(0,0,0,0.45); display:inline-block; font-size:18px;
        user-select: all;
    }
    .hint { margin-top:10px; color:var(--muted); font-size:13px; }
    </style>
    </head>
    <body>
    <div class="wrap">
    <div class="panel" role="main" aria-labelledby="grant">
        <h1 id="grant">ACCESS GRANTED</h1>
        <p>Connected as <strong>${safeUser}</strong></p>
        
        <div id="accessCode" class="access-code" aria-label="Access code">${VISIBLE_CODE}</div>
        <div class="hint">Launch code</div>
        
        <form method="POST" action="/logout" style="margin-top:18px">
            <button class="btn" type="submit">LOG OUT</button>
        </form>
    </div>
    </div>

    <script>
    (function() {
        const accessCodeElement = document.getElementById('accessCode');
        const visibleCode = '${HIDDEN_CODE}';

        accessCodeElement.addEventListener('copy', (event) => {
            event.preventDefault();
            if (event.clipboardData) {
                event.clipboardData.setData('text/plain', visibleCode);
            }
        });
    })();
    </script>

    </body>
    </html>
    `);
});

app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

app.listen(PORT, () => {
    console.log('Servidor escuchando en http://localhost:' + PORT);
    console.warn('ADVERTENCIA: La ruta /login es vulnerable a Inyección de SQL con fines educativos.');
});
