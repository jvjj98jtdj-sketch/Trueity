const promptBox = document.getElementById("prompt");
const generateBtn = document.getElementById("generateBtn");
const resultCard = document.getElementById("resultCard");
const resultCode = document.getElementById("resultCode");
const copyBtn = document.getElementById("copyBtn");

const menuBtn = document.getElementById("menuBtn");
const closeBtn = document.getElementById("closeBtn");
const drawer = document.getElementById("drawer");

let lastGeneratedProject = null;

// Быстрые действия
document.querySelectorAll(".quick-actions button").forEach((btn) => {
btn.addEventListener("click", () => {
promptBox.value =
btn.dataset.prompt +
" современный, адаптивный, красивый и хорошо структурированный.";

promptBox.focus();
});
});

// Генерация
generateBtn.addEventListener("click", generateCode);

promptBox.addEventListener("keydown", (event) => {
if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
generateCode();
}
});

async function generateCode() {
const request = promptBox.value.trim();

if (!request) {
promptBox.focus();
promptBox.placeholder =
"Сначала опиши, что должен создать Trueity...";
return;
}

setLoading(true);

try {
const response = await fetch("/api/generate", {
method: "POST",
headers: {
"Content-Type": "application/json"
},
body: JSON.stringify({
prompt: request
})
});

const data = await response.json();

if (!response.ok) {
throw new Error(
data.error || "Ошибка генерации."
);
}

lastGeneratedProject = data;

const combinedCode = buildPreviewCode(data);

resultCode.textContent = combinedCode;
resultCard.hidden = false;

resultCard.scrollIntoView({
behavior: "smooth",
block: "center"
});

} catch (error) {
resultCard.hidden = false;

resultCode.textContent =
"❌ Ошибка Trueity\n\n" +
error.message +
"\n\nПроверь сервер и API-ключ.";

console.error(error);

} finally {
setLoading(false);
}
}

// Объединяем проект для показа пользователю
function buildPreviewCode(project) {
return `<!-- TRUEITY GENERATED PROJECT -->

<!-- ================= HTML ================= -->

${project.html || ""}


<!-- ================= CSS ================= -->

<style>
${project.css || ""}
</style>


<!-- ================= JAVASCRIPT ================= -->

<script>
${project.js || ""}
<\/script>`;
}

// Копирование
copyBtn.addEventListener("click", async () => {
try {
await navigator.clipboard.writeText(
resultCode.textContent
);

copyBtn.textContent = "Скопировано ✓";

setTimeout(() => {
copyBtn.textContent = "Копировать";
}, 1500);

} catch {
copyBtn.textContent = "Ошибка";

setTimeout(() => {
copyBtn.textContent = "Копировать";
}, 1500);
}
});

// Состояние кнопки
function setLoading(loading) {
generateBtn.disabled = loading;

const text =
generateBtn.querySelector("span:first-child");

if (!text) return;

text.textContent = loading
? "Trueity думает..."
: "Создать код";
}

// Меню
menuBtn.addEventListener("click", () => {
drawer.classList.add("open");
});

closeBtn.addEventListener("click", () => {
drawer.classList.remove("open");
});

