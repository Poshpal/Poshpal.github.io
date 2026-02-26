let allQuestions = [];          // Todas las preguntas del JSON
let selectedQuestions = [];     // Las preguntas seleccionadas al azar
let currentQuestion = 0;
let userAnswers = [];

let timerInterval = null;
let startTime = null;
let totalTimeSeconds = 0;

const startScreen     = document.getElementById('start-screen');
const examContent     = document.getElementById('exam-content');
const numQuestionsInput = document.getElementById('num-questions');
const startBtn        = document.getElementById('start-btn');
const startError      = document.getElementById('start-error');
const totalInfo       = document.getElementById('total-questions-info');

const progressEl      = document.getElementById('progress');
const counterEl       = document.getElementById('question-counter');
const questionText    = document.getElementById('question-text');
const optionsContainer = document.getElementById('options');
const prevBtn         = document.getElementById('prev-btn');
const nextBtn         = document.getElementById('next-btn');
const quizContainer   = document.getElementById('quiz-container');
const resultsContainer = document.getElementById('results');
const scoreEl         = document.getElementById('score');
const reviewEl        = document.getElementById('review');
const restartBtn      = document.getElementById('restart-btn');
const mapButtons      = document.getElementById('map-buttons');

// Función para barajar un arreglo (Fisher-Yates shuffle moderno)
function shuffleArray(array) {
    const copy = [...array]; // no modificamos el original
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// Cargar todas las preguntas al inicio
async function loadAllQuestions() {
    try {
        const response = await fetch('preguntas.json');
        if (!response.ok) throw new Error(`status: ${response.status}`);
        allQuestions = await response.json();

        // Mostrar cuántas preguntas hay disponibles
        totalInfo.textContent = `Hay ${allQuestions.length} preguntas disponibles en el banco.`;
    } catch (error) {
        console.error('Error al cargar preguntas.json:', error);
        startError.textContent = "No se pudo cargar el archivo de preguntas. Verifica que exista 'preguntas.json'";
        startError.classList.remove('hidden');
        startBtn.disabled = true;
    }
}

// Iniciar examen con número seleccionado
function startExam() {
       const desired = parseInt(numQuestionsInput.value);
        
    if (isNaN(desired) || desired < 1) {
        startError.textContent = "Ingresa un número válido (mínimo 1)";
        startError.classList.remove('hidden');
        return;
    }

    if (desired > allQuestions.length) {
        startError.textContent = `Solo hay ${allQuestions.length} preguntas disponibles`;
        startError.classList.remove('hidden');
        return;
    }

    startError.classList.add('hidden');

    // Seleccionar preguntas al azar
    selectedQuestions = getRandomQuestions(allQuestions, desired);
    userAnswers = new Array(selectedQuestions.length).fill(null);
    currentQuestion = 0;

    const tiempoIdealMin = (desired * 1).toFixed(1);
    document.getElementById('tiempo-ideal').textContent = `${tiempoIdealMin} minutos`;

    // Iniciar temporizador
    startTimer();


    // Mostrar examen y ocultar pantalla inicial
    startScreen.classList.add('hidden');
    examContent.classList.remove('hidden');

    renderQuestion();
}

// Selecciona n preguntas al azar sin repetir
function getRandomQuestions(array, n) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
}

function renderQuestion() {
    if (selectedQuestions.length === 0) return;

    const q = selectedQuestions[currentQuestion];
    
    counterEl.textContent = `Pregunta ${currentQuestion + 1} de ${selectedQuestions.length}`;
    progressEl.style.width = `${((currentQuestion + 1) / selectedQuestions.length) * 100}%`;

    questionText.textContent = q.text;
    optionsContainer.innerHTML = '';

    // ────────────────────────────────────────────────
    //            BARAJADO DINÁMICO AQUÍ
    // ────────────────────────────────────────────────
    const shuffledOptions = shuffleArray(q.options);
    // ────────────────────────────────────────────────

    shuffledOptions.forEach((option, index) => {
        const label = document.createElement('label');
        label.className = 'option-label';
        
        // Usamos el índice dentro del arreglo barajado
        // pero guardamos la referencia al índice ORIGINAL para evaluar después
        const originalIndex = q.options.indexOf(option); // importante para saber cuál era la correcta

        label.innerHTML = `
            <input type="radio" name="answer" value="${originalIndex}" 
                   ${userAnswers[currentQuestion] === originalIndex ? 'checked' : ''}>
            ${option.text}
        `;

        label.querySelector('input').addEventListener('change', () => {
            userAnswers[currentQuestion] = originalIndex;
            renderMap();
        });

        optionsContainer.appendChild(label);
    });

    prevBtn.disabled = currentQuestion === 0;
    nextBtn.textContent = currentQuestion === selectedQuestions.length - 1 
        ? 'Finalizar examen' 
        : 'Siguiente →';

    renderMap();
}

function renderMap() {
    mapButtons.innerHTML = '';
    selectedQuestions.forEach((_, i) => {
        const btn = document.createElement('div');
        btn.className = `map-btn ${userAnswers[i] ? 'answered' : ''} ${i === currentQuestion ? 'current' : ''}`;
        btn.textContent = i + 1;
        btn.addEventListener('click', () => {
            currentQuestion = i;
            renderQuestion();
        });
        mapButtons.appendChild(btn);
    });
}

function showResults() {
    stopTimer();

    quizContainer.classList.add('hidden');
    resultsContainer.classList.remove('hidden');

    let correctCount = 0;
    let html = '';

    selectedQuestions.forEach((q, i) => {
        const userIndex = userAnswers[i];
        const isCorrect = userIndex !== null && q.options[userIndex]?.correct === true;

        if (isCorrect) correctCount++;

        const userAnswerText = userIndex !== null 
            ? q.options[userIndex].text 
            : '(sin responder)';

        const correctAnswerText = q.options.find(opt => opt.correct)?.text || '(no definida)';

        html += `
            <div class="review-item ${isCorrect ? 'correct' : 'incorrect'}">
                <strong>Pregunta ${i + 1}:</strong> ${q.text}<br>
                <strong>Tu respuesta:</strong> ${userAnswerText}<br>
                <strong>Respuesta correcta:</strong> ${correctAnswerText}<br>
                <strong>Sustento legal:</strong> 
                <span style="color: #00695c; font-style: italic;">${q.sustento || '(No disponible)'}</span>
            </div>
        `;
    });

    const percentage = Math.round((correctCount / selectedQuestions.length) * 100);
    scoreEl.innerHTML = `${correctCount}/${selectedQuestions.length} <span style="font-size:1.5rem">(${percentage}%)</span>`;
    reviewEl.innerHTML = html;

    // Tiempo final
    const tiempoIdealSegundos = selectedQuestions.length * 60; // 1 min = 60 segundos
    const diferencia = totalTimeSeconds - tiempoIdealSegundos;
    
    let mensajeTiempo = `Tiempo empleado: <strong>${formatTime(totalTimeSeconds)}</strong><br>`;
    mensajeTiempo += `Tiempo ideal estimado: <strong>${formatTime(tiempoIdealSegundos)}</strong><br>`;
    
    if (diferencia > 60) {
        mensajeTiempo += `<span style="color:#c62828">Te tomaste ${formatTime(Math.abs(diferencia))} más de lo estimado</span>`;
    } else if (diferencia < -60) {
        mensajeTiempo += `<span style="color:#2e7d32">Terminaste ${formatTime(Math.abs(diferencia))} antes de lo estimado</span>`;
    } else {
        mensajeTiempo += `<span style="color:#00695c">Tiempo muy cercano al estimado ✓</span>`;
    }

    document.getElementById('tiempo-resultado').innerHTML = mensajeTiempo;
    reviewEl.innerHTML = html;
}

function nextQuestion() {
    if (currentQuestion < selectedQuestions.length - 1) {
        currentQuestion++;
        renderQuestion();
    } else {
        showResults();
    }
}

function prevQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        renderQuestion();
    }
}

// Eventos
startBtn.addEventListener('click', startExam);
numQuestionsInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') startExam();
});

prevBtn.addEventListener('click', prevQuestion);
nextBtn.addEventListener('click', nextQuestion);

restartBtn.addEventListener('click', () => {
  
    stopTimer();
    document.getElementById('timer-display').textContent = '00:00';
    document.getElementById('tiempo-ideal').textContent = '—';

    resultsContainer.classList.add('hidden');
    examContent.classList.add('hidden');
    startScreen.classList.remove('hidden');
    numQuestionsInput.value = selectedQuestions.length; // mantener el último número usado
    startError.classList.add('hidden');
    location.reload();

   });

   function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    startTime = Date.now();
    totalTimeSeconds = 0;
    
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        totalTimeSeconds = elapsed;
        
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        
        document.getElementById('timer-display').textContent = `${minutes}:${seconds}`;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min} min ${sec.toString().padStart(2, '0')} s`;
}

   // Cargar preguntas al iniciar la página
loadAllQuestions();