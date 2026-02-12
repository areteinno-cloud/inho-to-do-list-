document.addEventListener('DOMContentLoaded', () => {
    // ─── Selectors ───
    const todoInput = document.getElementById('todo-input');
    const addBtn = document.getElementById('add-btn');
    const todoList = document.getElementById('todo-list');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const itemsLeft = document.getElementById('items-left');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const dateDisplay = document.getElementById('date-display');
    const totalTasksEl = document.getElementById('total-tasks');
    const totalTimeEl = document.getElementById('total-time');

    // ─── State ───
    let todos = JSON.parse(localStorage.getItem('todos-timer')) || [];
    let currentFilter = 'all';
    let timerIntervals = {}; // { todoId: intervalId }

    // ─── Init ───
    updateDate();
    renderTodos();
    resumeActiveTimers();

    // ─── Event Listeners ───
    addBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    todoList.addEventListener('click', handleTodoClick);
    clearCompletedBtn.addEventListener('click', clearCompleted);

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderTodos();
        });
    });

    // ─── Functions ───

    function updateDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.textContent = new Date().toLocaleDateString('ko-KR', options);
    }

    function addTodo() {
        const text = todoInput.value.trim();
        if (text === '') return;

        const newTodo = {
            id: Date.now(),
            text: text,
            completed: false,
            timing: false,       // is the timer currently running?
            elapsed: 0,          // total elapsed seconds
            timerStart: null     // timestamp when current timer session started
        };

        todos.push(newTodo);
        saveTodos();
        renderTodos();
        todoInput.value = '';
        todoInput.focus();
    }

    function handleTodoClick(e) {
        const item = e.target.closest('.todo-item');
        if (!item) return;
        const id = Number(item.getAttribute('data-id'));

        // Toggle Complete
        if (e.target.closest('.checkbox-btn')) {
            const todo = todos.find(t => t.id === id);
            if (!todo) return;

            // If completing a running task, stop the timer
            if (!todo.completed && todo.timing) {
                stopTimer(id);
            }

            todo.completed = !todo.completed;
            saveTodos();
            renderTodos();
            return;
        }

        // Timer toggle
        if (e.target.closest('.timer-btn')) {
            const todo = todos.find(t => t.id === id);
            if (!todo || todo.completed) return;

            if (todo.timing) {
                stopTimer(id);
            } else {
                startTimer(id);
            }
            saveTodos();
            renderTodos();
            return;
        }

        // Delete
        if (e.target.closest('.delete-btn')) {
            stopTimer(id);
            // Reset animation and play delete animation
            item.style.animation = 'none';
            item.offsetHeight; // force reflow
            item.style.animation = 'slideIn 0.3s ease-in reverse forwards';
            setTimeout(() => {
                todos = todos.filter(t => t.id !== id);
                saveTodos();
                renderTodos();
            }, 300);
            return;
        }
    }

    function startTimer(id) {
        const todo = todos.find(t => t.id === id);
        if (!todo) return;

        todo.timing = true;
        todo.timerStart = Date.now();
        saveTodos();

        // Start interval to update display
        timerIntervals[id] = setInterval(() => {
            updateTimerDisplay(id);
            updateStats();
        }, 1000);
    }

    function stopTimer(id) {
        const todo = todos.find(t => t.id === id);
        if (!todo) return;

        if (todo.timing && todo.timerStart) {
            const sessionElapsed = Math.floor((Date.now() - todo.timerStart) / 1000);
            todo.elapsed += sessionElapsed;
        }

        todo.timing = false;
        todo.timerStart = null;
        saveTodos();

        if (timerIntervals[id]) {
            clearInterval(timerIntervals[id]);
            delete timerIntervals[id];
        }
    }

    function getElapsed(todo) {
        let total = todo.elapsed || 0;
        if (todo.timing && todo.timerStart) {
            total += Math.floor((Date.now() - todo.timerStart) / 1000);
        }
        return total;
    }

    function formatTime(totalSeconds) {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function updateTimerDisplay(id) {
        const timerEl = document.querySelector(`.todo-item[data-id="${id}"] .timer-display`);
        const todo = todos.find(t => t.id === id);
        if (timerEl && todo) {
            timerEl.textContent = formatTime(getElapsed(todo));
        }
    }

    function resumeActiveTimers() {
        todos.forEach(todo => {
            if (todo.timing && todo.timerStart) {
                timerIntervals[todo.id] = setInterval(() => {
                    updateTimerDisplay(todo.id);
                    updateStats();
                }, 1000);
            }
        });
    }

    function clearCompleted() {
        // Stop timers for completed items
        todos.filter(t => t.completed).forEach(t => stopTimer(t.id));
        todos = todos.filter(t => !t.completed);
        saveTodos();
        renderTodos();
    }

    function saveTodos() {
        localStorage.setItem('todos-timer', JSON.stringify(todos));
    }

    function updateStats() {
        const activeCount = todos.filter(t => !t.completed).length;
        totalTasksEl.textContent = `${todos.length}개 할 일`;

        const totalSeconds = todos.reduce((sum, t) => sum + getElapsed(t), 0);
        totalTimeEl.textContent = `총 ${formatTime(totalSeconds)}`;

        itemsLeft.textContent = `${activeCount}개 남음`;
    }

    function renderTodos() {
        // Filter
        let filtered = todos;
        if (currentFilter === 'active') {
            filtered = todos.filter(t => !t.completed);
        } else if (currentFilter === 'completed') {
            filtered = todos.filter(t => t.completed);
        }

        todoList.innerHTML = '';

        if (filtered.length === 0) {
            todoList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>${currentFilter === 'completed' ? '완료된 항목이 없습니다' : currentFilter === 'active' ? '진행 중인 항목이 없습니다' : '할 일을 추가해보세요!'}</p>
                </div>
            `;
        }

        filtered.forEach(todo => {
            const li = document.createElement('li');
            li.classList.add('todo-item');
            if (todo.completed) li.classList.add('completed');
            if (todo.timing) li.classList.add('timing');
            li.setAttribute('data-id', todo.id);

            const elapsed = getElapsed(todo);
            const hasTime = elapsed > 0 || todo.timing;

            li.innerHTML = `
                <div class="todo-top-row">
                    <div class="todo-item-content">
                        <button class="checkbox-btn" title="${todo.completed ? '미완료로 변경' : '완료로 변경'}">
                            <i class="fas fa-check"></i>
                        </button>
                        <span class="todo-text">${escapeHtml(todo.text)}</span>
                    </div>
                    <div class="todo-actions">
                        ${!todo.completed ? `
                            <button class="timer-btn ${todo.timing ? 'active' : ''}" title="${todo.timing ? '타이머 정지' : '타이머 시작'}">
                                <i class="fas ${todo.timing ? 'fa-pause' : 'fa-play'}"></i>
                            </button>
                        ` : ''}
                        <button class="delete-btn" title="삭제">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                ${hasTime ? `
                    <div class="todo-timer-row">
                        <span class="timer-dot ${todo.timing ? 'active' : ''}"></span>
                        <span class="timer-display ${todo.timing ? 'active' : ''}">${formatTime(elapsed)}</span>
                        <span class="timer-label">${todo.timing ? '진행 중' : todo.completed ? '완료' : '일시정지'}</span>
                    </div>
                ` : ''}
            `;

            todoList.appendChild(li);
        });

        updateStats();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ─── 3D Space Background ───
    const canvas = document.getElementById('space-canvas');
    const ctx = canvas.getContext('2d');
    let W, H, centerX, centerY;

    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        centerX = W / 2;
        centerY = H / 2;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ── Stars ──
    const STAR_COUNT = 800;
    const stars = [];

    function createStar(farStart) {
        return {
            x: (Math.random() - 0.5) * W * 3,
            y: (Math.random() - 0.5) * H * 3,
            z: farStart ? Math.random() * 2000 : Math.random() * 2000,
            prevZ: 2000,
            size: Math.random() * 1.5 + 0.5,
            color: Math.random() < 0.7
                ? `hsl(${220 + Math.random() * 40}, 60%, ${70 + Math.random() * 30}%)`
                : Math.random() < 0.5
                    ? `hsl(${270 + Math.random() * 30}, 70%, ${75 + Math.random() * 25}%)`
                    : `hsl(${180 + Math.random() * 20}, 65%, ${70 + Math.random() * 30}%)`
        };
    }

    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push(createStar(true));
    }

    // ── Nebula clouds ──
    const nebulae = [];
    const NEBULA_COUNT = 5;
    for (let i = 0; i < NEBULA_COUNT; i++) {
        nebulae.push({
            x: Math.random() * W,
            y: Math.random() * H,
            radius: 100 + Math.random() * 200,
            hue: [270, 200, 330, 240, 180][i],
            alpha: 0.015 + Math.random() * 0.015,
            driftX: (Math.random() - 0.5) * 0.15,
            driftY: (Math.random() - 0.5) * 0.1,
            pulse: Math.random() * Math.PI * 2
        });
    }

    // ── Shooting stars ──
    const shootingStars = [];

    function maybeSpawnShootingStar() {
        if (Math.random() < 0.004 && shootingStars.length < 2) {
            const fromLeft = Math.random() < 0.5;
            shootingStars.push({
                x: fromLeft ? -20 : W + 20,
                y: Math.random() * H * 0.5,
                vx: fromLeft ? (4 + Math.random() * 6) : -(4 + Math.random() * 6),
                vy: 2 + Math.random() * 3,
                life: 1,
                decay: 0.008 + Math.random() * 0.008,
                length: 60 + Math.random() * 80,
                hue: Math.random() < 0.5 ? 270 : 190
            });
        }
    }

    // ── Warp speed setting ──
    const warpSpeed = 1.5;

    // ── Main animation ──
    function animateSpace() {
        // Slight fade for motion trail effect
        ctx.fillStyle = 'rgba(10, 14, 26, 0.25)';
        ctx.fillRect(0, 0, W, H);

        // Draw nebulae
        nebulae.forEach(n => {
            n.x += n.driftX;
            n.y += n.driftY;
            n.pulse += 0.005;

            // Wrap around
            if (n.x < -n.radius) n.x = W + n.radius;
            if (n.x > W + n.radius) n.x = -n.radius;
            if (n.y < -n.radius) n.y = H + n.radius;
            if (n.y > H + n.radius) n.y = -n.radius;

            const pulseAlpha = n.alpha + Math.sin(n.pulse) * 0.005;
            const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
            grad.addColorStop(0, `hsla(${n.hue}, 60%, 50%, ${pulseAlpha})`);
            grad.addColorStop(0.5, `hsla(${n.hue}, 50%, 40%, ${pulseAlpha * 0.5})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.fillRect(n.x - n.radius, n.y - n.radius, n.radius * 2, n.radius * 2);
        });

        // Update and draw stars
        stars.forEach(star => {
            star.prevZ = star.z;
            star.z -= warpSpeed * 2;

            // Reset star when it passes the camera
            if (star.z <= 0) {
                star.x = (Math.random() - 0.5) * W * 3;
                star.y = (Math.random() - 0.5) * H * 3;
                star.z = 2000;
                star.prevZ = 2000;
                return;
            }

            // 3D projection: current position
            const sx = (star.x / star.z) * 300 + centerX;
            const sy = (star.y / star.z) * 300 + centerY;

            // 3D projection: previous position (for trail)
            const px = (star.x / star.prevZ) * 300 + centerX;
            const py = (star.y / star.prevZ) * 300 + centerY;

            // Out of screen check
            if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) return;

            // Size based on depth (closer = bigger)
            const depth = 1 - star.z / 2000;
            const radius = star.size * depth * 2.5;
            const alpha = depth * 0.9;

            // Draw warp trail
            ctx.strokeStyle = star.color.replace(')', `, ${alpha * 0.5})`).replace('hsl', 'hsla');
            ctx.lineWidth = Math.max(0.5, radius * 0.6);
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(sx, sy);
            ctx.stroke();

            // Draw star with glow
            ctx.beginPath();
            ctx.arc(sx, sy, Math.max(0.3, radius), 0, Math.PI * 2);
            ctx.fillStyle = star.color.replace(')', `, ${alpha})`).replace('hsl', 'hsla');
            ctx.shadowColor = star.color;
            ctx.shadowBlur = radius * 4;
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Shooting stars
        maybeSpawnShootingStar();
        shootingStars.forEach((s, i) => {
            s.x += s.vx;
            s.y += s.vy;
            s.life -= s.decay;

            if (s.life <= 0) {
                shootingStars.splice(i, 1);
                return;
            }

            const tailX = s.x - s.vx * s.length * 0.15;
            const tailY = s.y - s.vy * s.length * 0.15;

            const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
            grad.addColorStop(0, `hsla(${s.hue}, 80%, 80%, 0)`);
            grad.addColorStop(1, `hsla(${s.hue}, 80%, 80%, ${s.life * 0.7})`);

            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(s.x, s.y);
            ctx.stroke();

            // Bright head
            ctx.beginPath();
            ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${s.hue}, 90%, 90%, ${s.life})`;
            ctx.shadowColor = `hsla(${s.hue}, 80%, 80%, 0.8)`;
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        requestAnimationFrame(animateSpace);
    }

    // Initial full clear
    ctx.fillStyle = 'rgba(10, 14, 26, 1)';
    ctx.fillRect(0, 0, W, H);
    animateSpace();

    // ─── Apple-Style Floating Motivational Quotes ───
    const motivationQuotes = [
        '지금 이 순간에 집중하라',
        'DO IT NOW',
        '어제의 나를 이겨라',
        'STAY FOCUSED',
        '포기하지 마라',
        'NEVER GIVE UP',
        '작은 진전도 진전이다',
        'MAKE IT HAPPEN',
        '시작이 반이다',
        'KEEP GOING',
        '오늘도 성장하는 나',
        'NO EXCUSES',
        '할 수 있다',
        'PUSH YOUR LIMITS',
        '꾸준함이 답이다',
        'JUST START',
        '목표를 향해 전진',
        'BELIEVE IN YOURSELF',
        '열정은 멈추지 않는다',
        'GRIND NEVER STOPS',
        '실패는 성공의 어머니',
        'BE UNSTOPPABLE',
        '더 강해져라',
        'DISCIPLINE IS FREEDOM',
        '꿈을 현실로',
        'RISE AND GRIND',
        '한계를 넘어서',
        'EVERY SECOND COUNTS',
    ];

    const colorClasses = ['', 'accent', 'cyan', 'pink', 'gold'];
    const animTypes = ['anim-sweep', 'anim-zoom', 'anim-drift', 'anim-slash'];
    const motivationLayer = document.getElementById('motivation-layer');

    function spawnQuote() {
        const quote = document.createElement('div');
        quote.classList.add('floating-quote');

        // Random color class
        const colorClass = colorClasses[Math.floor(Math.random() * colorClasses.length)];
        if (colorClass) quote.classList.add(colorClass);

        // Random animation type
        const animType = animTypes[Math.floor(Math.random() * animTypes.length)];
        quote.classList.add(animType);

        // Random quote text
        quote.textContent = motivationQuotes[Math.floor(Math.random() * motivationQuotes.length)];

        // Cinematic sizing — bigger, bolder
        const duration = 10 + Math.random() * 18;  // 10-28 seconds
        const top = Math.random() * 85;             // 0-85% from top
        const size = 1.2 + Math.random() * 2.8;    // 1.2-4.0rem
        const startX = Math.random() * 60 + 10;    // 10-70vw for drift anim

        quote.style.setProperty('--duration', `${duration}s`);
        quote.style.setProperty('--delay', '0s');
        quote.style.setProperty('--top', `${top}%`);
        quote.style.setProperty('--size', `${size}rem`);
        quote.style.setProperty('--startX', `${startX}vw`);

        motivationLayer.appendChild(quote);

        // Remove after animation completes
        setTimeout(() => {
            if (quote.parentNode) quote.remove();
        }, duration * 1000 + 1000);
    }

    // Spawn initial batch staggered — cinematic intro
    for (let i = 0; i < 10; i++) {
        setTimeout(() => spawnQuote(), i * 600);
    }

    // Continue spawning at higher rate for constant movement
    setInterval(spawnQuote, 2000);
});
