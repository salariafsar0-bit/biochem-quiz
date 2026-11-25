// حالا کلید از داخل مرورگر خوانده می‌شود
let API_KEY = localStorage.getItem('biochemApiKey') || ""; 
// آدرس ورکر کلودفلر شما (اسمی که خودت گفتی)
const API_URL = "https://biochem-proxy.saliafsar0.workers.dev"; 
const MODEL_NAME = "gpt-4o-mini"; 

// مدیریت دکمه ذخیره کلید
const apiKeyInput = document.getElementById('apiKeyInput');
const apiKeyCard = document.getElementById('apiKeyCard');

if (API_KEY) {
    apiKeyInput.value = API_KEY;
    apiKeyCard.style.display = 'none'; // اگر کلید قبلا ذخیره شده، کارت رو مخفی کن
}

document.getElementById('saveApiKeyBtn').addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('biochemApiKey', key);
        API_KEY = key;
        alert('کلید با موفقیت ذخیره شد!');
        apiKeyCard.style.display = 'none';
    } else {
        alert('لطفاً یک کلید معتبر وارد کنید.');
    }
});

// تولید یا خواندن کد شناسایی یکتا برای کاربر
let myUserId = localStorage.getItem('biochemUserId');
if (!myUserId) {
    myUserId = 'User-' + Math.floor(1000 + Math.random() * 9000); 
    localStorage.setItem('biochemUserId', myUserId);
}
document.getElementById('myIdDisplay').textContent = myUserId;

// بقیه المان‌های صفحه...
const setupSection = document.getElementById('setupSection');
const quizSection = document.getElementById('quizSection');
const resultSection = document.getElementById('resultSection');
const generateBtn = document.getElementById('generateBtn');
const nextBtn = document.getElementById('nextBtn');
const noteInput = document.getElementById('noteInput');
const questionText = document.getElementById('questionText');
const optionsContainer = document.getElementById('optionsContainer');
const timerDisplay = document.getElementById('timerDisplay');
const progressDisplay = document.getElementById('progressDisplay');
const reviewContainer = document.getElementById('reviewContainer');
const summaryBtn = document.getElementById('summaryBtn');
const summaryContainer = document.getElementById('summaryContainer');

let questions = [];
let userAnswers = []; 
let currentQuestionIndex = 0;
let timerInterval;
let timeLeft = 0;

// --- سیستم خواندن فایل ورد ---
document.getElementById('wordFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const arrayBuffer = event.target.result;
        mammoth.extractRawText({arrayBuffer: arrayBuffer})
            .then(function(result) {
                noteInput.value = result.value;
                document.getElementById('fileNameDisplay').textContent = "✅ فایل با موفقیت خوانده شد.";
            })
            .catch(function(err) {
                alert("خطا در خواندن فایل Word. لطفاً از فرمت .docx استفاده کنید.");
            });
    };
    reader.readAsArrayBuffer(file);
});

// --- شروع آزمون ---
generateBtn.addEventListener('click', async () => {
    if (!API_KEY) {
        alert('لطفاً ابتدا کلید API خود را در بالای صفحه وارد و ذخیره کنید.');
        return;
    }

    const noteText = noteInput.value.trim();
    const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
    const numQ = parseInt(document.getElementById('numQuestions').value);
    const timeLimit = parseInt(document.getElementById('timeLimit').value);

    if (!noteText) return alert('لطفاً ابتدا متن جزوه را وارد کنید.');

    generateBtn.textContent = '⏳ در حال تولید سوالات... (لطفاً صبر کنید)';
    generateBtn.disabled = true;

    let difficultyPrompt = "";
    if (difficulty === "دشوار") {
        difficultyPrompt = "سوالات باید سطح بالا، بالینی، طولانی و به صورت سناریو (Case-based) باشند. از دانشجو بخواه که با ترکیب چند مفهوم، تحلیل و تشخیص نهایی انجام دهد.";
    } else if (difficulty === "متوسط") {
        difficultyPrompt = "سوالات باید ترکیبی از مفاهیم پایه و کمی تحلیل باشند.";
    } else {
        difficultyPrompt = "سوالات باید مستقیم، کوتاه و بر اساس مفاهیم پایه جزوه باشند.";
    }

    const prompt = `
    تو یک استاد بیوشیمی بالینی و متخصص علوم آزمایشگاهی هستی. بر اساس متن جزوه زیر، دقیقا ${numQ} تست چهارگزینه‌ای طراحی کن.
    سطح دشواری درخواستی: ${difficulty}
    ${difficultyPrompt}
    
    خروجی باید فقط و فقط یک آبجکت JSON معتبر با ساختار زیر باشد (هیچ متن اضافه‌ای، هیچ کاما اضافه‌ای):
    {
      "questions": [
        {
          "question": "متن سوال",
          "options": ["گزینه۱", "گزینه۲", "گزینه۳", "گزینه۴"],
          "correctIndex": 0,
          "explanation": "توضیح علمی پاسخ صحیح"
        }
      ]
    }
    متن جزوه: ${noteText}
    `;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(`خطای سرور ${response.status}: ${errData.error ? errData.error.message : 'کلید API نامعتبر است یا اعتبار حساب تمام شده'}`);
        }

        const data = await response.json();
        let parsedData = JSON.parse(data.choices[0].message.content);
        
        if (Array.isArray(parsedData)) questions = parsedData;
        else if (parsedData.questions && Array.isArray(parsedData.questions)) questions = parsedData.questions;
        else {
            const possibleArray = Object.values(parsedData).find(val => Array.isArray(val));
            if (possibleArray) questions = possibleArray;
            else throw new Error("ساختار خروجی هوش مصنوعی نامعتبر است.");
        }
        
        questions = questions.filter(q => q.question && q.options && q.options.length > 0);
        if(questions.length === 0) throw new Error("هیچ سوالی تولید نشد. متن جزوه ممکن است کوتاه باشد.");

        startQuiz(timeLimit);

    } catch (error) {
        alert('مشکل در تولید سوالات:\n' + error.message);
        generateBtn.textContent = '🚀 شروع آزمون';
        generateBtn.disabled = false;
    }
});

// ... (توابع startQuiz, updateTimerDisplay, showQuestion, selectOption, endQuiz, saveAndShowLeaderboard, summaryBtn, retakeBtn, setupPdfButton دقیقاً مثل قبل هستند و نیازی به تغییر ندارند)
// برای جلوگیری از طولانی شدن پیام، از اینجا به بعد کد رو کپی کن:

function startQuiz(minutes) {
    setupSection.classList.add('hidden');
    quizSection.classList.remove('hidden');
    currentQuestionIndex = 0;
    userAnswers = new Array(questions.length).fill(null); 
    timeLeft = minutes * 60;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) endQuiz();
    }, 1000);
    showQuestion();
}
function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `⏱ ${m}:${s}`;
}
function showQuestion() {
    const q = questions[currentQuestionIndex];
    progressDisplay.textContent = `سوال ${currentQuestionIndex + 1} از ${questions.length}`;
    questionText.textContent = q.question;
    nextBtn.classList.add('hidden');
    optionsContainer.innerHTML = '';
    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        if (userAnswers[currentQuestionIndex] === index) {
            btn.style.background = 'rgba(59, 130, 246, 0.3)';
            btn.style.borderColor = '#3b82f6';
        }
        btn.onclick = () => selectOption(index, btn);
        optionsContainer.appendChild(btn);
    });
    if (userAnswers[currentQuestionIndex] !== null) nextBtn.classList.remove('hidden');
}
function selectOption(selectedIndex, btn) {
    userAnswers[currentQuestionIndex] = selectedIndex; 
    const allBtns = optionsContainer.querySelectorAll('.option-btn');
    allBtns.forEach(b => {
        b.style.background = 'rgba(255,255,255,0.05)';
        b.style.borderColor = 'rgba(255,255,255,0.1)';
    });
    btn.style.background = 'rgba(59, 130, 246, 0.3)';
    btn.style.borderColor = '#3b82f6';
    nextBtn.classList.remove('hidden');
    if (currentQuestionIndex === questions.length - 1) nextBtn.textContent = 'پایان آزمون 🏁';
    else nextBtn.textContent = 'سوال بعدی ⬅';
}
nextBtn.addEventListener('click', () => {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        showQuestion();
    } else { endQuiz(); }
});
function endQuiz() {
    clearInterval(timerInterval);
    quizSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
    let correctCount = 0;
    let reviewHTML = '<h3 style="margin-bottom: 1rem; color: #f8fafc;">📝 بررسی پاسخ‌ها</h3>';
    questions.forEach((q, index) => {
        const userAns = userAnswers[index];
        const isCorrect = userAns === q.correctIndex;
        if (isCorrect) correctCount++;
        reviewHTML += `
            <div style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <p style="font-weight: bold; margin-bottom: 0.5rem;">${index + 1}. ${q.question}</p>
                <p style="color: ${isCorrect ? '#22c55e' : '#ef4444'};">
                    پاسخ شما: ${userAns !== null ? q.options[userAns] : 'بدون پاسخ'} ${isCorrect ? '✅' : '❌'}
                </p>
                ${!isCorrect ? `<p style="color: #22c55e; margin-top: 0.3rem;">پاسخ صحیح: ${q.options[q.correctIndex]}</p>` : ''}
                <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 0.5rem;">توضیح: ${q.explanation}</p>
            </div>`;
    });
    const finalScore = Math.round((correctCount / questions.length) * 100);
    document.getElementById('finalScore').textContent = finalScore;
    document.getElementById('correctCount').textContent = correctCount;
    document.getElementById('wrongCount').textContent = questions.length - correctCount;
    reviewContainer.innerHTML = reviewHTML;
    saveAndShowLeaderboard(finalScore);
    setupPdfButton();
}
function saveAndShowLeaderboard(newScore) {
    let leaderboardData = JSON.parse(localStorage.getItem('biochemLeaderboardV2')) || {};
    if (!leaderboardData[myUserId] || newScore > leaderboardData[myUserId]) leaderboardData[myUserId] = newScore;
    localStorage.setItem('biochemLeaderboardV2', JSON.stringify(leaderboardData));
    let scoresArray = Object.keys(leaderboardData).map(id => { return { id: id, score: leaderboardData[id] }; });
    scoresArray.sort((a, b) => b.score - a.score); 
    document.getElementById('totalPlayers').textContent = scoresArray.length;
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '';
    scoresArray.slice(0, 5).forEach((user, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        const isMe = user.id === myUserId ? ' (شما)' : '';
        list.innerHTML += `<li><span>${medal} ${user.id}${isMe}</span><span>${user.score} از ۱۰۰</span></li>`;
    });
}
summaryBtn.addEventListener('click', async () => {
    summaryBtn.textContent = '⏳ در حال تولید خلاصه...';
    summaryBtn.disabled = true;
    let allQuestionsText = questions.map(q => q.question).join(" \n ");
    const prompt = `
    تو یک استاد بیوشیمی هستی. بر اساس سوالات آزمونی که دانشجو داده است، یک پاراگراف مروری روان، جامع و آموزشی بنویس. 
    هدف این است که دانشجو با خواندن این پاراگراف، تمام مفاهیم مهم سوالاتی که در آزمون به او داده شده را یک بار دیگر مرور کند.
    سوالات مطرح شده در آزمون: 
    ${allQuestionsText}
    خروجی فقط و فقط متن پاراگراف باشد (بدون مقدمه و بدون JSON).`;
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
            body: JSON.stringify({ model: MODEL_NAME, messages: [{ role: "user", content: prompt }] })
        });
        const data = await response.json();
        summaryContainer.textContent = data.choices[0].message.content;
        summaryContainer.classList.remove('hidden');
        summaryBtn.textContent = '📚 خلاصه مروری (تولید شد)';
    } catch (error) {
        alert('خطا در تولید خلاصه: ' + error.message);
        summaryBtn.textContent = '📚 دریافت خلاصه مروری';
        summaryBtn.disabled = false;
    }
});
document.getElementById('retakeBtn').addEventListener('click', () => {
    resultSection.classList.add('hidden');
    setupSection.classList.remove('hidden');
    generateBtn.textContent = '🚀 شروع آزمون';
    generateBtn.disabled = false;
    questions = [];
    summaryBtn.textContent = '📚 دریافت خلاصه مروری';
    summaryBtn.disabled = false;
    summaryContainer.classList.add('hidden');
    window.scrollTo(0, 0);
});
function setupPdfButton() {
    document.getElementById('pdfBtn').onclick = () => {
        const element = document.createElement('div');
        element.style.padding = '20px';
        element.style.background = 'white';
        element.style.color = 'black';
        element.style.direction = 'rtl';
        element.style.fontFamily = 'Vazirmatn, Tahoma, sans-serif'; 
        element.style.fontSize = '14px';
        element.style.lineHeight = '1.8';
        let htmlContent = `
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="margin: 0; font-size: 22px;">آزمون بیوشیمی بالینی - تیم NetPHP.ir</h1>
                <p style="margin: 5px 0; color: #555; font-size: 12px;">دانشجو: سنا حکیمیان | دانشکده علوم آزمایشگاهی شهید صدوقی</p>
                <hr style="border: 1px solid #ddd; margin-top: 10px;">
            </div>`;
        questions.forEach((q, i) => {
            htmlContent += `
                <div style="margin-bottom: 25px; page-break-inside: avoid; border-bottom: 1px dashed #ccc; padding-bottom: 15px;">
                    <p style="font-weight: bold; margin-bottom: 10px; font-size: 15px;">${i+1}. ${q.question}</p>
                    <div style="padding-right: 15px; margin-bottom: 15px;">
                        ${q.options.map((opt, idx) => `<p style="margin: 5px 0;">${idx+1}) ${opt}</p>`).join('')}
                    </div>
                    <div style="margin-top: 10px; padding: 10px; background: #f0fdf4; border-right: 4px solid #22c55e; color: #166534; font-size: 13px;">
                        <strong>پاسخ صحیح: گزینه ${q.correctIndex + 1}</strong><br>
                        <strong>توضیح:</strong> ${q.explanation}
                    </div>
                </div>`;
        });
        element.innerHTML = htmlContent;
        element.style.position = 'absolute';
        element.style.left = '-9999px';
        document.body.appendChild(element);
        const opt = {
            margin: [0.5, 0.5, 0.5, 0.5], filename: 'Biochem-Quiz-NetPHP.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'], avoid: '.page-break-avoid' } 
        };
        html2pdf().set(opt).from(element).save().then(() => {
            document.body.removeChild(element);
        });
    };
}
