// ===== STATE =====
let currentStep = 1;
let selectedGoal = '';
let resultData = null;

// ===== STEP NAVIGATION =====
function nextStep(step) {
    if (step === 2 && !document.getElementById('audience').value.trim()) {
        shakeElement(document.getElementById('audience'));
        return;
    }
    if (step === 3 && !selectedGoal) return;

    goToStep(step);
}

function prevStep(step) {
    goToStep(step);
}

function goToStep(step) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById('step' + step).classList.add('active');

    // Update progress
    document.getElementById('progressFill').style.width = (step * 25) + '%';

    document.querySelectorAll('.step-dot').forEach(dot => {
        const dotStep = parseInt(dot.dataset.step);
        dot.classList.remove('active', 'completed');
        if (dotStep === step) dot.classList.add('active');
        else if (dotStep < step) dot.classList.add('completed');
    });

    currentStep = step;

    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== GOAL SELECTION =====
function selectGoal(card) {
    document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedGoal = card.dataset.goal;
    document.getElementById('btn2').disabled = false;
}

// ===== CHARACTER / WORD COUNTS =====
document.getElementById('audience').addEventListener('input', function() {
    document.getElementById('audienceCount').textContent = this.value.length;
});

document.getElementById('content').addEventListener('input', function() {
    const words = this.value.trim() ? this.value.trim().split(/\s+/).length : 0;
    document.getElementById('wordCount').textContent = words;
});

// ===== ANALYSE CONTENT =====
async function analyseContent() {
    const audience = document.getElementById('audience').value.trim();
    const content = document.getElementById('content').value.trim();

    if (!content) {
        shakeElement(document.getElementById('content'));
        return;
    }

    // Go to results step
    goToStep(4);

    // Show loading
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('resultsContainer').style.display = 'none';

    // Animate loading messages
    const messages = [
        'Checking hook strength',
        'Analysing slide structure',
        'Evaluating audience fit',
        'Generating improvements',
        'Crafting better hooks',
        'Polishing your content'
    ];
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
        msgIndex = (msgIndex + 1) % messages.length;
        document.getElementById('loadingSubtext').textContent = messages[msgIndex];
    }, 2500);

    try {
        const response = await fetch('api/improve.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                audience: audience,
                goal: selectedGoal,
                content: content
            })
        });

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        clearInterval(msgInterval);

        if (data.error) throw new Error(data.error);

        resultData = data;
        renderResults(data);
    } catch (err) {
        clearInterval(msgInterval);
        document.getElementById('loadingState').innerHTML = `
            <div style="color: var(--pink); font-size: 2rem; margin-bottom: 16px;">!</div>
            <div class="loading-text">Something went wrong</div>
            <div class="loading-subtext" style="animation:none">${escapeHtml(err.message)}</div>
            <button class="btn btn-back" onclick="goToStep(3)" style="margin-top:24px">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Go Back
            </button>
        `;
    }
}

// ===== RENDER RESULTS =====
function renderResults(data) {
    // Score animation
    const score = data.score || 65;
    const circumference = 2 * Math.PI * 52; // ~327
    const offset = circumference - (score / 100) * circumference;
    const ring = document.getElementById('scoreRing');

    document.getElementById('scoreSummary').textContent = data.score_summary || '';

    // Animate score
    setTimeout(() => {
        ring.style.strokeDashoffset = offset;
        ring.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)';

        let current = 0;
        const numEl = document.getElementById('scoreNumber');
        const interval = setInterval(() => {
            current += Math.ceil(score / 40);
            if (current >= score) { current = score; clearInterval(interval); }
            numEl.textContent = current;
        }, 30);
    }, 200);

    // Hooks
    const hooksHtml = (data.hooks || []).map((hook, i) => {
        const labels = ['Best Hook', 'Alternative', 'Bold Option'];
        return `
            <div class="hook-card">
                <div class="hook-rank">${labels[i] || 'Option ' + (i+1)}</div>
                <div class="hook-text">${escapeHtml(hook.text)}</div>
                <div class="hook-reason">${escapeHtml(hook.reason)}</div>
            </div>
        `;
    }).join('');
    document.getElementById('hooksContent').innerHTML = hooksHtml;

    // Improved slides
    const slidesHtml = (data.slides || []).map((slide, i) => `
        <div class="slide-card">
            <div class="slide-number">Slide ${i + 1}</div>
            <div class="slide-content">${escapeHtml(slide)}</div>
        </div>
    `).join('');
    document.getElementById('improvedContent').innerHTML = slidesHtml;

    // Feedback
    const feedbackHtml = (data.feedback || []).map(fb => `
        <div class="feedback-item">
            <div class="feedback-icon ${fb.type === 'issue' ? 'issue' : 'tip'}">${fb.type === 'issue' ? '!' : '✓'}</div>
            <div class="feedback-text">${fb.text}</div>
        </div>
    `).join('');
    document.getElementById('feedbackContent').innerHTML = feedbackHtml;

    // Show results
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('resultsContainer').style.display = 'block';
}

// ===== TABS =====
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById('tab-' + tabName).classList.add('active');
}

// ===== COPY =====
function copyResults() {
    if (!resultData) return;

    let text = '=== CAROUSEL CONTENT - IMPROVED VERSION ===\n\n';

    text += '--- HOOK SUGGESTIONS ---\n\n';
    (resultData.hooks || []).forEach((hook, i) => {
        text += `Option ${i + 1}: ${hook.text}\n`;
        text += `Why: ${hook.reason}\n\n`;
    });

    text += '--- IMPROVED SLIDES ---\n\n';
    (resultData.slides || []).forEach((slide, i) => {
        text += `[Slide ${i + 1}]\n${slide}\n\n`;
    });

    text += '--- FEEDBACK ---\n\n';
    (resultData.feedback || []).forEach(fb => {
        text += `${fb.type === 'issue' ? '!' : '✓'} ${fb.text}\n`;
    });

    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!'));
}

// ===== DOWNLOAD DOCX =====
async function downloadDocx() {
    if (!resultData || typeof docx === 'undefined') return;

    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = docx;

    const children = [];

    // Title
    children.push(new Paragraph({
        children: [new TextRun({ text: 'Carousel Content — Improved', bold: true, size: 36, font: 'Calibri' })],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 }
    }));

    // Meta
    children.push(new Paragraph({
        children: [
            new TextRun({ text: 'Audience: ', bold: true, size: 22, font: 'Calibri' }),
            new TextRun({ text: document.getElementById('audience').value, size: 22, font: 'Calibri' })
        ],
        spacing: { after: 100 }
    }));

    children.push(new Paragraph({
        children: [
            new TextRun({ text: 'Goal: ', bold: true, size: 22, font: 'Calibri' }),
            new TextRun({ text: selectedGoal.charAt(0).toUpperCase() + selectedGoal.slice(1), size: 22, font: 'Calibri' })
        ],
        spacing: { after: 100 }
    }));

    children.push(new Paragraph({
        children: [
            new TextRun({ text: 'Content Score: ', bold: true, size: 22, font: 'Calibri' }),
            new TextRun({ text: `${resultData.score}/100`, size: 22, font: 'Calibri', color: 'F92672' })
        ],
        spacing: { after: 400 }
    }));

    // Hook Suggestions
    children.push(new Paragraph({
        children: [new TextRun({ text: 'Hook Suggestions', bold: true, size: 28, font: 'Calibri' })],
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 }
    }));

    const hookLabels = ['Best Hook', 'Alternative', 'Bold Option'];
    (resultData.hooks || []).forEach((hook, i) => {
        children.push(new Paragraph({
            children: [new TextRun({ text: `${hookLabels[i] || 'Option ' + (i+1)}: `, bold: true, size: 22, font: 'Calibri' }),
                       new TextRun({ text: hook.text, size: 22, font: 'Calibri' })],
            spacing: { after: 60 }
        }));
        children.push(new Paragraph({
            children: [new TextRun({ text: hook.reason, italics: true, size: 20, font: 'Calibri', color: '666666' })],
            spacing: { after: 200 }
        }));
    });

    // Improved Slides
    children.push(new Paragraph({
        children: [new TextRun({ text: 'Improved Slides', bold: true, size: 28, font: 'Calibri' })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 }
    }));

    (resultData.slides || []).forEach((slide, i) => {
        children.push(new Paragraph({
            children: [new TextRun({ text: `Slide ${i + 1}`, bold: true, size: 22, font: 'Calibri', color: 'F92672' })],
            spacing: { after: 80 }
        }));
        // Split slide content by newlines
        const lines = slide.split('\n');
        lines.forEach(line => {
            children.push(new Paragraph({
                children: [new TextRun({ text: line, size: 22, font: 'Calibri' })],
                spacing: { after: 60 }
            }));
        });
        children.push(new Paragraph({ spacing: { after: 200 } }));
    });

    // Feedback
    children.push(new Paragraph({
        children: [new TextRun({ text: 'Feedback & Suggestions', bold: true, size: 28, font: 'Calibri' })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 }
    }));

    (resultData.feedback || []).forEach(fb => {
        children.push(new Paragraph({
            children: [
                new TextRun({ text: fb.type === 'issue' ? '! ' : '✓ ', bold: true, size: 22, font: 'Calibri', color: fb.type === 'issue' ? 'F92672' : '50FA7B' }),
                new TextRun({ text: fb.text.replace(/<\/?strong>/g, ''), size: 22, font: 'Calibri' })
            ],
            spacing: { after: 120 }
        }));
    });

    // Footer
    children.push(new Paragraph({
        children: [new TextRun({ text: '\nGenerated by AW Media Content Improver', italics: true, size: 18, font: 'Calibri', color: '999999' })],
        spacing: { before: 400 }
    }));

    const doc = new Document({
        sections: [{ properties: {}, children: children }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'carousel-content-improved.docx';
    a.click();
    URL.revokeObjectURL(url);

    showToast('Downloaded!');
}

// ===== START OVER =====
function startOver() {
    document.getElementById('audience').value = '';
    document.getElementById('content').value = '';
    document.getElementById('audienceCount').textContent = '0';
    document.getElementById('wordCount').textContent = '0';
    selectedGoal = '';
    resultData = null;
    document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('btn2').disabled = true;

    // Reset loading state HTML in case of previous error
    document.getElementById('loadingState').innerHTML = `
        <div class="spinner"></div>
        <div class="loading-text">Analysing your content...</div>
        <div class="loading-subtext" id="loadingSubtext">Checking hook strength</div>
    `;
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('resultsContainer').style.display = 'none';

    // Reset score ring
    const ring = document.getElementById('scoreRing');
    if (ring) {
        ring.style.transition = 'none';
        ring.style.strokeDashoffset = 327;
    }

    goToStep(1);
}

// ===== HELPERS =====
function shakeElement(el) {
    el.style.animation = 'none';
    el.offsetHeight; // trigger reflow
    el.style.animation = 'shake 0.4s ease';
    el.style.borderColor = 'var(--pink)';
    setTimeout(() => { el.style.borderColor = ''; el.style.animation = ''; }, 1000);
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Add shake keyframe
const style = document.createElement('style');
style.textContent = '@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}';
document.head.appendChild(style);

// Allow Enter to advance on audience field
document.getElementById('audience').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') nextStep(2);
});
