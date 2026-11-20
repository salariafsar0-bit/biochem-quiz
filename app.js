// ⚠️ کلید API خودت را اینجا قرار بده
const API_KEY = "sk-IR539NDhCUXxvDtzUttgQIM8Dep2OuDidMDMxtcbFTv7FfNU"; 
const API_URL = "https://api.gapgpt.app/v1/chat/completions";
const MODEL_NAME = "gpt-4o-mini"; 

// المان‌های صفحه
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

// متغیرهای آزمون
let questions = [];
let userAnswers = []; // ذخیره پاسخ‌های کاربر
let currentQuestionIndex = 0;
let timerInterval;
let timeLeft = 0;

// شروع آزمون
generateBtn.addEventListener('click', async () => {
    const noteText = noteInput.value.trim();
    const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
    const numQ = parseInt(document.getElementById('numQuestions').value);
    const timeLimit = parseInt(document.getElementById('timeLimit').value);

    if (!noteText) return alert('لطفاً ابتدا متن جزوه را وارد کنید.');

    generateBtn.textContent = '⏳ در حال تولید سوالات... (ممکن است کمی طول بکشد)';
    generateBtn.disabled = true;

    const prompt = `
    تو یک استاد بیوشیمی بالینی هستی. بر اساس متن جزوه زیر، ${numQ} تست چهارگزینه‌ای بالینی و علمی طراحی کن.
    سطح دشواری: ${difficulty}
    خروجی را دقیقاً به صورت JSON با ساختار زیر بده (فقط JSON خالص بدون هیچ متن اضافه):
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

        const data = await response.json();
        if (!response.ok) throw new Error(data.error ? data.error.message : 'خطای نامشخص');

        const parsedData = JSON.parse(data.choices[0].message.content);
        questions = parsedData.questions;
        
        if(questions.length === 0) throw new Error("هیچ سوالی تولید نشد.");

        startQuiz(timeLimit);

    } catch (error) {
        alert('مشکل در تولید سوالات: ' + error.message);
        generateBtn.textContent = '🚀 شروع آزمون';
        generateBtn.disabled = false;
    }
});

function startQuiz(minutes) {
    setupSection.classList.add('hidden');
    quizSection.classList.remove('hidden');
    
    currentQuestionIndex = 0;
    userAnswers = new Array(questions.length).fill(null); // ریست کردن پاسخ‌ها
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
        
        // اگر کاربر قبلا گزینه‌ای انتخاب کرده بود، دوباره هایلایت شود
        if (userAnswers[currentQuestionIndex] === index) {
            btn.style.background = 'rgba(59, 130, 246, 0.3)';
            btn.style.borderColor = '#3b82f6';
        }

        btn.onclick = () => selectOption(index, btn);
        optionsContainer.appendChild(btn);
    });

    // اگر قبلا جواب داده، دکمه بعدی فعال باشد
    if (userAnswers[currentQuestionIndex] !== null) {
        nextBtn.classList.remove('hidden');
    }
}

function selectOption(selectedIndex, btn) {
    userAnswers[currentQuestionIndex] = selectedIndex; // ذخیره انتخاب کاربر
    
    // برداشتن هایلایت از بقیه
    const allBtns = optionsContainer.querySelectorAll('.option-btn');
    allBtns.forEach(b => {
        b.style.background = 'rgba(255,255,255,0.05)';
        b.style.borderColor = 'rgba(255,255,255,0.1)';
    });

    // هایلایت کردن گزینه انتخاب شده
    btn.style.background = 'rgba(59, 130, 246, 0.3)';
    btn.style.borderColor = '#3b82f6';

    // نمایش دکمه بعدی
    nextBtn.classList.remove('hidden');
    if (currentQuestionIndex === questions.length - 1) {
        nextBtn.textContent = 'پایان آزمون 🏁';
    } else {
        nextBtn.textContent = 'سوال بعدی ⬅';
    }
}

nextBtn.addEventListener('click', () => {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        showQuestion();
    } else {
        endQuiz();
    }
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

        // ساخت بخش بررسی برای هر سوال
        reviewHTML += `
            <div style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <p style="font-weight: bold; margin-bottom: 0.5rem;">${index + 1}. ${q.question}</p>
                <p style="color: ${isCorrect ? '#22c55e' : '#ef4444'};">
                    پاسخ شما: ${userAns !== null ? q.options[userAns] : 'بدون پاسخ'} ${isCorrect ? '✅' : '❌'}
                </p>
                ${!isCorrect ? `<p style="color: #22c55e; margin-top: 0.3rem;">پاسخ صحیح: ${q.options[q.correctIndex]}</p>` : ''}
                <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 0.5rem;">توضیح: ${q.explanation}</p>
            </div>
        `;
    });

    const finalScore = Math.round((correctCount / questions.length) * 100);
    document.getElementById('finalScore').textContent = finalScore;
    document.getElementById('correctCount').textContent = correctCount;
    document.getElementById('wrongCount').textContent = questions.length - correctCount;
    
    reviewContainer.innerHTML = reviewHTML;
    
    saveAndShowLeaderboard(finalScore);
    setupPdfButton();
}

// لیدربورد (با استفاده از LocalStorage)
function saveAndShowLeaderboard(newScore) {
    let scores = JSON.parse(localStorage.getItem('biochemLeaderboard')) || [];
    scores.push(newScore);
    scores.sort((a, b) => b - a);
    localStorage.setItem('biochemLeaderboard', JSON.stringify(scores));

    document.getElementById('totalPlayers').textContent = scores.length;
    const list = document.getElementById('leaderboardList');
    list.innerHTML = '';
    
    scores.slice(0, 5).forEach((s, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        list.innerHTML += `<li><span>${medal} کاربر ناشناس</span><span>${s} از ۱۰۰</span></li>`;
    });
}

// آزمون مجدد
document.getElementById('retakeBtn').addEventListener('click', () => {
    resultSection.classList.add('hidden');
    setupSection.classList.remove('hidden');
    generateBtn.textContent = '🚀 شروع آزمون';
    generateBtn.disabled = false;
    questions = [];
    window.scrollTo(0, 0);
});

// ساخت PDF
function setupPdfButton() {
    document.getElementById('pdfBtn').onclick = () => {
        const element = document.createElement('div');
        element.style.padding = '30px';
        element.style.background = 'white';
        element.style.color = 'black';
        element.style.direction = 'rtl';
        element.style.fontFamily = 'Vazirmatn, sans-serif';
        
        element.innerHTML = `<h1 style="text-align:center;">آزمون بیوشیمی بالینی - تیم NetPHP</h1><hr>`;
        
        questions.forEach((q, i) => {
            element.innerHTML += `
                <div style="margin-bottom: 20px;">
                    <p style="font-weight:bold;">${i+1}. ${q.question}</p>
                    <ul style="list-style-type: none; padding-right: 10px;">
                        ${q.options.map((opt, idx) => `<li>${idx+1}) ${opt}</li>`).join('')}
                    </ul>
                    <p style="color: green; font-size: 0.9em; margin-top:5px;">پاسخ صحیح: گزینه ${q.correctIndex + 1} | توضیح: ${q.explanation}</p>
                </div>
            `;
        });

        const opt = {
            margin: 1,
            filename: 'Biochem-Quiz-NetPHP.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save();
    };
}
