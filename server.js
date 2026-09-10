const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const ROOT = __dirname;

// Читаем .env без npm
function loadEnv() {
const env = {};

const file = path.join(ROOT, ".env");

if (!fs.existsSync(file)) {
return env;
}

const text = fs.readFileSync(file, "utf8");

for (const line of text.split(/\r?\n/)) {
const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/);

if (match) {
let value = match[2].trim();

if (
(value.startsWith('"') && value.endsWith('"')) ||
(value.startsWith("'") && value.endsWith("'"))
) {
value = value.slice(1, -1);
}

env[match[1].trim()] = value;
}
}

return env;
}

const ENV = loadEnv();

const API_KEY = ENV.OPENAI_API_KEY;
const MODEL = ENV.OPENAI_MODEL || "gpt-5.6";

if (!API_KEY || API_KEY === "ТВОЙ_API_КЛЮЧ") {
console.log("⚠️ Не найден OPENAI_API_KEY в файле .env");
}

function sendJSON(res, status, data) {
res.writeHead(status, {
"Content-Type": "application/json; charset=utf-8"
});

res.end(JSON.stringify(data));
}

function getContentType(filePath) {
const ext = path.extname(filePath).toLowerCase();

const types = {
".html": "text/html; charset=utf-8",
".css": "text/css; charset=utf-8",
".js": "application/javascript; charset=utf-8",
".json": "application/json; charset=utf-8",
".txt": "text/plain; charset=utf-8"
};

return types[ext] || "application/octet-stream";
}

function serveFile(res, filePath) {
if (!fs.existsSync(filePath)) {
res.writeHead(404);
res.end("File not found");
return;
}

res.writeHead(200, {
"Content-Type": getContentType(filePath)
});

fs.createReadStream(filePath).pipe(res);
}

function readBody(req) {
return new Promise((resolve, reject) => {
let body = "";

req.on("data", chunk => {
body += chunk;

if (body.length > 1000000) {
reject(new Error("Request too large"));
req.destroy();
}
});

req.on("end", () => resolve(body));
req.on("error", reject);
});
}

function extractText(data) {
if (typeof data.output_text === "string") {
return data.output_text;
}

const parts = [];

for (const item of data.output || []) {
for (const content of item.content || []) {
if (
content.type === "output_text" &&
typeof content.text === "string"
) {
parts.push(content.text);
}
}
}

return parts.join("\n");
}

function cleanJSON(text) {
text = text.trim();

// Убираем ```json ... ```
text = text.replace(/^```json\s*/i, "");
text = text.replace(/^```\s*/i, "");
text = text.replace(/\s*```$/i, "");

return text.trim();
}

const server = http.createServer(async (req, res) => {

// Главная страница
if (req.method === "GET" && req.url === "/") {
serveFile(res, path.join(ROOT, "index.html"));
return;
}

// CSS
if (req.method === "GET" && req.url === "/style.css") {
serveFile(res, path.join(ROOT, "style.css"));
return;
}

// JavaScript
if (req.method === "GET" && req.url === "/script.js") {
serveFile(res, path.join(ROOT, "script.js"));
return;
}

// AI генерация
if (req.method === "POST" && req.url === "/api/generate") {

try {
if (!API_KEY || API_KEY === "ТВОЙ_API_КЛЮЧ") {
sendJSON(res, 500, {
error: "Добавь настоящий OPENAI_API_KEY в файл .env"
});
return;
}

const body = await readBody(req);
const requestData = JSON.parse(body);

const userPrompt = requestData.prompt;

if (!userPrompt || !userPrompt.trim()) {
sendJSON(res, 400, {
error: "Напиши, что нужно создать"
});
return;
}

const systemPrompt = `
Ты — Trueity AI Code Engine.

Твоя главная задача — писать максимально качественный код.

Ты умеешь создавать:
- HTML
- CSS
- JavaScript
- Python

При создании сайтов используй современный, чистый и хорошо структурированный код.

Очень важно:
1. Код должен быть рабочим.
2. Не добавляй лишние объяснения.
3. Учитывай адаптацию под телефон.
4. Делай красивый современный интерфейс.
5. Используй хорошие названия переменных и классов.
6. JavaScript должен реально работать.
7. Если пользователь просит сайт — создай полноценный сайт.

Верни ответ ТОЛЬКО в JSON такого вида:

{
"html": "...",
"css": "...",
"js": "...",
"python": "..."
}

Если Python не нужен, оставь "python" пустым.
`;

const response = await fetch(
"https://api.openai.com/v1/responses",
{
method: "POST",

headers: {
"Content-Type": "application/json",
"Authorization": `Bearer ${API_KEY}`
},

body: JSON.stringify({
model: MODEL,

reasoning: {
effort: "high"
},

input: [
{
role: "system",
content: [
{
type: "input_text",
text: systemPrompt
}
]
},
{
role: "user",
content: [
{
type: "input_text",
text: userPrompt
}
]
}
]
})
}
);

const data = await response.json();

if (!response.ok) {
console.error(data);

sendJSON(res, response.status, {
error:
data?.error?.message ||
"Ошибка OpenAI API"
});

return;
}

const text = extractText(data);

if (!text) {
sendJSON(res, 500, {
error: "AI не вернул текст"
});

return;
}

let result;

try {
result = JSON.parse(cleanJSON(text));
} catch (error) {
console.error("JSON parse error:", text);

sendJSON(res, 500, {
error: "AI вернул неправильный формат"
});

return;
}

sendJSON(res, 200, result);

} catch (error) {
console.error(error);

sendJSON(res, 500, {
error: error.message
});
}

return;
}

res.writeHead(404);
res.end("Not found");
});

server.listen(PORT, () => {
console.log("");
console.log("🚀 TRUEITY запущен!");
console.log(`🌐 Открой: http://localhost:${PORT}`);
console.log("");
});
