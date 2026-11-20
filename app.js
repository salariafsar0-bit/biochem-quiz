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
let userAnswers = []; 
let currentQuestionIndex = 0;
let timerInterval;
let timeLeft = 0;

generateBtn.addEventListener('click', async () => {
    const noteText = noteInput.value.trim();
    const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
    const numQ = parseInt(document.getElementById('numQuestions').value);
    const timeLimit = parseInt(document.getElementById('timeLimit').value);

    if (!noteText) return alert('لطفاً ابتدا متن جزوه را وارد کنید.');

    generateBtn.textContent = '⏳ در حال تولید سوالات... (لطفاً صبر کنید)';
    generateBtn.disabled = true;

    const prompt = `
    تو یک استاد بیوشیمی بالینی هستی. بر اساس متن جزوه زیر، دقیقا ${numQ} تست چهارگزینه‌ای طراحی کن.
    سطح دشواری: ${difficulty}
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

        const data = await response.json();
        if (!response.ok) throw new Error(data.error ? data.error.message : 'خطای نامشخص از سمت سرور');

        let parsedData = JSON.parse(data.choices[0].message.content);
        
        if (Array.isArray(parsedData)) {
            questions = parsedData;
        } else if (parsedData.questions && Array.isArray(parsedData.questions)) {
            questions = parsedData.questions;
        } else {
            const possibleArray = Object.values(parsedData).find(val => Array.isArray(val));
            if (possibleArray) {
                questions = possibleArray;
            } else {
                throw new Error("ساختار خروجی هوش مصنوعی نامعتبر است. لطفاً دوباره تلاش کنید.");
            }
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

    if (userAnswers[currentQuestionIndex] !== null) {
        nextBtn.classList.remove('hidden');
    }
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

document.getElementById('retakeBtn').addEventListener('click', () => {
    resultSection.classList.add('hidden');
    setupSection.classList.remove('hidden');
    generateBtn.textContent = '🚀 شروع آزمون';
    generateBtn.disabled = false;
    questions = [];
    window.scrollTo(0, 0);
});

// ✨ تابع حرفه‌ای ساخت PDF (بدون مشکل بریدگی)
function setupPdfButton() {
    document.getElementById('pdfBtn').onclick = async () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt', 'a4');
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 40;
        let yPos = 50;
        
        doc.setFontSize(16);
        doc.text("آزمون بیوشیمی بالینی - تیم NetPHP.ir", pageWidth / 2, yPos, { align: "center" });
        yPos += 30;
        
        doc.setFontSize(10);
        doc.text("---------------------------------------------------------", pageWidth / 2, yPos, { align: "center" });
        yPos += 30;

        questions.forEach((q, index) => {
            if (yPos > pageHeight - 100) {
                doc.addPage();
                yPos = 50;
            }

            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            const questionLines = doc.splitTextToSize(`${index + 1}. ${q.question}`, pageWidth - (margin * 2));
            doc.text(questionLines, pageWidth - margin, yPos, { align: "right" });
            yPos += (questionLines.length * 15) + 10;

            doc.setFont(undefined, 'normal');
            q.options.forEach((opt, optIndex) => {
                if (yPos > pageHeight - 50) { doc.addPage(); yPos = 50; }
                const optLines = doc.splitTextToSize(`${optIndex + 1}) ${opt}`, pageWidth - (margin * 2) - 20);
                doc.text(optLines, pageWidth - margin - 10, yPos, { align: "right" });
                yPos += (optLines.length * 15) + 5;
            });

            yPos += 10;
            if (yPos > pageHeight - 60) { doc.addPage(); yPos = 50; }
            doc.setTextColor(0, 128, 0);
            doc.setFont(undefined, 'bold');
            doc.text(`پاسخ صحیح: گزینه ${q.correctIndex + 1}`, pageWidth - margin, yPos, { align: "right" });
            yPos += 20;
            
            doc.setTextColor(100, 100, 100);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            const explLines = doc.splitTextToSize(`توضیح: ${q.explanation}`, pageWidth - (margin * 2));
            doc.text(explLines, pageWidth - margin, yPos, { align: "right" });
            yPos += (explLines.length * 15) + 30;
            
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(12);
        });

        doc.save('Biochem-Quiz-NetPHP.pdf');
    };
}
