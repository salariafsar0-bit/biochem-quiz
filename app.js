// اطلاعات کلودفلر شما
const CLOUDFLARE_ACCOUNT_ID = "081b35dcb5c837648266303964f6b36a"; 
const CLOUDFLARE_API_TOKEN = "cfut_eSJ2A2wBNwsQa4daC7QeohcrdYM8IpQOuXZqFYJVe0005c12"; 

const API_URL = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`;

const generateBtn = document.getElementById('generateBtn');
const noteInput = document.getElementById('noteInput');
const quizContainer = document.getElementById('quizContainer');
const questionContent = document.getElementById('questionContent');

generateBtn.addEventListener('click', async () => {
    const noteText = noteInput.value.trim();
    const difficulty = document.querySelector('input[name="difficulty"]:checked').value;

    if (!noteText) {
        alert('لطفاً ابتدا متن جزوه را وارد کنید.');
        return;
    }

    generateBtn.textContent = '⏳ در حال تولید تست...';
    generateBtn.disabled = true;

    const prompt = `
    تو یک استاد بیوشیمی بالینی هستی. بر اساس متن جزوه زیر، ۱ تست چهارگزینه‌ای بالینی و علمی طراحی کن.
    سطح دشواری: ${difficulty}
    خروجی را دقیقاً به صورت JSON با ساختار زیر بده (فقط JSON خالص بدون هیچ متن اضافه):
    {
      "question": "متن سوال",
      "options": ["گزینه۱", "گزینه۲", "گزینه۳", "گزینه۴"],
      "correctIndex": 0,
      "explanation": "توضیح علمی پاسخ صحیح"
    }

    متن جزوه:
    ${noteText}
    `;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`
            },
            body: JSON.stringify({
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`خطای سرور: ${response.status} - ${data.errors ? data.errors[0].message : 'خطای نامشخص'}`);
        }

        const quizData = JSON.parse(data.result.response);
        renderQuiz(quizData);

    } catch (error) {
        console.error(error);
        alert('مشکل: ' + error.message); 
    } finally {
        generateBtn.textContent = '✨ تولید تست';
        generateBtn.disabled = false;
    }
});

// تابع نمایش تست
function renderQuiz(quiz) {
    quizContainer.classList.remove('hidden');
    let html = `<h3 style="margin-bottom: 1rem; color: #60a5fa;">${quiz.question}</h3>`;
    html += `<div id="optionsContainer" style="display: flex; flex-direction: column; gap: 0.5rem;">`;
    quiz.options.forEach((opt, index) => {
        html += `<button class="option-btn" data-index="${index}" style="padding: 1rem; text-align: right; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white; cursor: pointer; transition: 0.2s;">${opt}</button>`;
    });
    html += `</div>`;
    html += `<div id="feedback" class="hidden" style="margin-top: 1rem; padding: 1rem; border-radius: 8px;"></div>`;
    questionContent.innerHTML = html;

    const optionBtns = document.querySelectorAll('.option-btn');
    optionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const selectedIndex = parseInt(btn.dataset.index);
            const isCorrect = selectedIndex === quiz.correctIndex;
            optionBtns.forEach(b => {
                b.disabled = true;
                if (parseInt(b.dataset.index) === quiz.correctIndex) {
                    b.style.background = 'rgba(34, 197, 94, 0.3)';
                    b.style.borderColor = '#22c55e';
                } else if (b === btn) {
                    b.style.background = 'rgba(239, 68, 68, 0.3)';
                    b.style.borderColor = '#ef4444';
                }
            });
            const feedback = document.getElementById('feedback');
            feedback.classList.remove('hidden');
            feedback.style.background = isCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
            feedback.style.border = `1px solid ${isCorrect ? '#22c55e' : '#ef4444'}`;
            feedback.innerHTML = `<strong style="color: ${isCorrect ? '#22c55e' : '#ef4444'};">${isCorrect ? '✅ پاسخ صحیح!' : '❌ پاسخ نادرست'}</strong><br><br><span style="color: #cbd5e1;">${quiz.explanation}</span>`;
        });
    });
}
