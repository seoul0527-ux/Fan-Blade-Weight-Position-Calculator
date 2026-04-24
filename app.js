// Constants and Tables
const BAL_TABLE = {
    'A': {35: 12.2, 45: 16.3, 55: 20.3, 65: 24.3, 75: 28.3, 85: 32.3},
    'B': {35: 23.3, 45: 30.9, 55: 38.5, 65: 46.1, 75: 53.8, 85: 61.4},
    'C': {35: 19.8, 45: 26.3, 55: 32.8, 65: 39.2, 75: 45.7, 85: 52.2},
    'D': {35: 14.4, 45: 19.1, 55: 23.8, 65: 28.5, 75: 33.2, 85: 37.9},
    'E': {35:  7.6, 45: 10.0, 55: 12.5, 65: 15.0, 75: 17.5, 85: 19.9}
};

const PITCHES_FROM_A = {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4};

const WEIGHT_TO_PN = {
    35: "UP11691",
    45: "FW49312",
    55: "FW49313",
    65: "FW49314",
    75: "FW50938",
    85: "FW50939",
};

const N_POS = 20;
const DEG_STEP = 360 / N_POS;
const CANVAS_W = 600;
const CANVAS_H = 600;
const R_OUTER = 250;
const R_TICK = 230;
const R_NUM = 265;

// DOM Elements
const canvas = document.getElementById('fanCanvas');
const ctx = canvas.getContext('2d');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const formMode1 = document.getElementById('form-mode1');
const formMode2 = document.getElementById('form-mode2');
const resultDisplay = document.getElementById('result-display');
const copyBtn = document.getElementById('copy-btn');
const toast = document.getElementById('toast');

// Utility Functions
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function angleToXY(cx, cy, r, angleDeg) {
    const rad = toRadians(angleDeg);
    const x = cx - r * Math.sin(rad);
    const y = cy - r * Math.cos(rad);
    return { x, y };
}

function selectWeightFromTable(wn) {
    const target = Math.abs(parseFloat(wn));
    const low = 0.9 * target;
    const high = 1.1 * target;
    let best = null;

    for (const [posLetter, col] of Object.entries(BAL_TABLE)) {
        for (const [weightGStr, tval] of Object.entries(col)) {
            const weightG = parseInt(weightGStr);
            if (tval >= low && tval <= high) {
                if (!best || tval > best.tval) {
                    best = { tval, posLetter, weightG };
                }
            }
        }
    }
    return best;
}

function drawTextBounded(ctx, text, x, y, align, dx = 0, dy = 0) {
    ctx.textAlign = align;
    let px = x + dx;
    let py = y + dy;
    
    const metrics = ctx.measureText(text);
    const width = metrics.width;
    
    let left = px;
    let right = px;
    if (align === 'center') {
        left = px - width / 2;
        right = px + width / 2;
    } else if (align === 'right') {
        left = px - width;
        right = px;
    } else if (align === 'left') {
        left = px;
        right = px + width;
    }
    
    const pad = 10;
    if (left < pad) px += (pad - left);
    if (right > CANVAS_W - pad) px -= (right - (CANVAS_W - pad));
    if (py < pad + 10) py = pad + 10;
    if (py > CANVAS_H - pad) py = CANVAS_H - pad;
    
    ctx.fillText(text, px, py);
}

// Canvas Drawing
function drawBase() {
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw outer circle
    ctx.beginPath();
    ctx.arc(cx, cy, R_OUTER, 0, 2 * Math.PI);
    ctx.strokeStyle = '#cbd5e1'; // Slate 300
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#64748b'; // Slate 500
    ctx.strokeStyle = '#94a3b8'; // Slate 400
    ctx.font = 'bold 12px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < N_POS; i++) {
        const angle = i * DEG_STEP;
        
        // Tick marks
        const p1 = angleToXY(cx, cy, R_TICK, angle);
        const p2 = angleToXY(cx, cy, R_OUTER, angle);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Dots on outer circle
        const pDot = angleToXY(cx, cy, R_OUTER, angle);
        ctx.beginPath();
        ctx.arc(pDot.x, pDot.y, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Numbers
        const pNum = angleToXY(cx, cy, R_NUM, angle);
        ctx.fillStyle = '#1e293b'; // Slate 800
        ctx.fillText((i + 1).toString(), pNum.x, pNum.y);
        ctx.fillStyle = '#64748b'; // Reset fillStyle for next dot
    }
}

function drawResultsOnCanvas(pos, Wn) {
    drawBase(); // Redraw base to clear previous markers

    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;
    const angle_cv = (pos - 1) * DEG_STEP;
    const selected = selectWeightFromTable(Wn);

    let base_angle, base_desc;
    if (Wn > 0) {
        base_angle = (angle_cv + 180.0) % 360.0;
        base_desc = "Compensation Vector + 180° (반대편)";
    } else {
        base_angle = angle_cv;
        base_desc = "Compensation Vector";
    }

    // Draw Compensation Vector Marker (Red)
    const cvPos = angleToXY(cx, cy, R_OUTER, angle_cv);
    ctx.beginPath();
    ctx.arc(cvPos.x, cvPos.y, 8, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ef4444'; // Red
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 12px Inter, Arial';
    ctx.textAlign = 'center';
    
    // Choose anchor logic
    const a = angle_cv % 360;
    let dx = 0, dy = 0, align = 'center';
    if (a >= 45 && a < 135) { align = 'left'; dx = 15; }
    else if (a >= 135 && a < 225) { align = 'center'; dy = -20; }
    else if (a >= 225 && a < 315) { align = 'right'; dx = -15; }
    else { align = 'center'; dy = 20; }
    
    drawTextBounded(ctx, "Compensation Vector", cvPos.x, cvPos.y, align, dx, dy);

    // Draw Selected Weights (Green)
    if (selected) {
        const pitch = PITCHES_FROM_A[selected.posLetter];
        const ddeg = pitch * DEG_STEP;

        const angleW_ccw = (base_angle + ddeg) % 360;
        const angleW_cw = (base_angle - ddeg) % 360;

        ctx.strokeStyle = '#10b981'; // Green
        ctx.fillStyle = '#10b981';

        if (ddeg === 0) {
            const wPos = angleToXY(cx, cy, R_OUTER, angleW_ccw);
            ctx.beginPath();
            ctx.arc(wPos.x, wPos.y, 7, 0, 2 * Math.PI);
            ctx.stroke();
            
            // Adjust offset
            const aw = angleW_ccw % 360;
            let dwx = 0, dwy = 0, wAlign = 'center';
            if (aw >= 45 && aw < 135) { wAlign = 'left'; dwx = 15; }
            else if (aw >= 135 && aw < 225) { dwy = -20; }
            else if (aw >= 225 && aw < 315) { wAlign = 'right'; dwx = -15; }
            else { dwy = 20; }
            
            drawTextBounded(ctx, "웨이트 장착 위치 (1개)", wPos.x, wPos.y, wAlign, dwx, dwy);
        } else {
            // Weight 1
            const wPos1 = angleToXY(cx, cy, R_OUTER, angleW_ccw);
            ctx.beginPath();
            ctx.arc(wPos1.x, wPos1.y, 7, 0, 2 * Math.PI);
            ctx.stroke();
            
            let dwx1 = 0, dwy1 = 0, wAlign1 = 'center';
            const aw1 = angleW_ccw % 360;
            if (aw1 >= 45 && aw1 < 135) { wAlign1 = 'left'; dwx1 = 15; }
            else if (aw1 >= 135 && aw1 < 225) { dwy1 = -20; }
            else if (aw1 >= 225 && aw1 < 315) { wAlign1 = 'right'; dwx1 = -15; }
            else { dwy1 = 20; }
            
            drawTextBounded(ctx, "웨이트 1", wPos1.x, wPos1.y, wAlign1, dwx1, dwy1);

            // Weight 2
            const wPos2 = angleToXY(cx, cy, R_OUTER, angleW_cw);
            ctx.beginPath();
            ctx.arc(wPos2.x, wPos2.y, 7, 0, 2 * Math.PI);
            ctx.stroke();
            
            let dwx2 = 0, dwy2 = 0, wAlign2 = 'center';
            const aw2 = angleW_cw % 360;
            if (aw2 >= 45 && aw2 < 135) { wAlign2 = 'left'; dwx2 = 15; }
            else if (aw2 >= 135 && aw2 < 225) { dwy2 = -20; }
            else if (aw2 >= 225 && aw2 < 315) { wAlign2 = 'right'; dwx2 = -15; }
            else { dwy2 = 20; }
            
            drawTextBounded(ctx, "웨이트 2", wPos2.x, wPos2.y, wAlign2, dwx2, dwy2);
        }
    }

    // Draw Position 1 Marker (Gold)
    const p1Pos = angleToXY(cx, cy, R_OUTER, 0);
    ctx.beginPath();
    ctx.arc(p1Pos.x, p1Pos.y, 8, 0, 2 * Math.PI);
    ctx.strokeStyle = '#fbbf24'; // Gold
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#d97706';
    drawTextBounded(ctx, "Blade Position 1", p1Pos.x, p1Pos.y, 'center', 0, 25);

    return { angle_cv, base_desc, selected };
}

// Logic for Mode 1
function calculateMode1(e) {
    e.preventDefault();
    
    const pos = parseInt(document.getElementById('m1-pos').value);
    const S = parseFloat(document.getElementById('m1-s').value);
    const R = parseFloat(document.getElementById('m1-r').value);

    if (pos < 1 || pos > 20) {
        alert("교체 블레이드 Position은 1~20 사이의 정수여야 합니다.");
        return;
    }

    const Wn = 0.654 * (R - S);
    const target = Math.abs(Wn);
    const low = 0.9 * target;
    const high = 1.1 * target;

    const { angle_cv, base_desc, selected } = drawResultsOnCanvas(pos, Wn);


    let lines = [
        "[입력]",
        `■ 교체 블레이드 Position = ${pos}`,
        "",
        `■ 장탈 블레이드의 Radial Moment Weight (S) = ${S}`,
        "",
        `■ 장착 블레이드의 Radial Moment Weight (R) = ${R}`,
        "",
        "[계산]",
        `■ Compensation Vector 각도 = (Position - 1) × 18 = (${pos} - 1) × 18 = ${angle_cv.toFixed(0)}°`,
        "",
        `■ Wn = 0.654 × (R - S) = 0.654 × (${R} - ${S}) = ${Wn.toFixed(4)}`,
        "",
        `■ 허용 범위(±10%) = [${low.toFixed(2)}, ${high.toFixed(2)}]`,
        "",
        `■ 웨이트 기준 각도(Wn 값이 양수인 경우 180도 반대편) = ${base_desc}`,
        ""
    ];

    if (!selected) {
        lines.push("[결과] 허용 범위 내 일치 항목 없음");
    } else {
        const pn = WEIGHT_TO_PN[selected.weightG] || "N/A";
        lines.push(
            "[결과]",
            `■ 선택 위치 = ${selected.posLetter}  (Pitches from A = ${PITCHES_FROM_A[selected.posLetter]})`,
            "",
            `■ 선택 중량 = ${selected.weightG} oz·in (BAL TABLE 기준)`,
            "",
            `■ 표 값[oz·in] = ${selected.tval}`,
            "",
            `■ 장착 PN = ${pn}`,
            "",
            "** Weight의 장착위치가 Compensation Vector와 같은 경우에 Weight는 1개만 장착"
        );
    }

    resultDisplay.innerHTML = lines.join('\n');
}

// Logic for Mode 2
function calculateMode2(e) {
    e.preventDefault();
    
    const pos = parseInt(document.getElementById('m2-pos').value);
    const R = parseFloat(document.getElementById('m2-r').value);
    const P = parseFloat(document.getElementById('m2-p').value);
    const S = parseFloat(document.getElementById('m2-s').value);
    const O = parseFloat(document.getElementById('m2-o').value);

    if (pos < 1 || pos > 20) {
        alert("교체 블레이드 Position은 1~20 사이의 정수여야 합니다.");
        return;
    }

    const mag = (R - P) - (S - O);
    const Wn = mag * 0.654;
    const target = Math.abs(Wn);
    const low = 0.9 * target;
    const high = 1.1 * target;

    const { angle_cv, base_desc, selected } = drawResultsOnCanvas(pos, Wn);


    let lines = [
        "[입력]",
        `■ 교체 블레이드 Position = ${pos}`,
        "",
        `■ 장착할 블레이드의 Radial Moment Weight 값 (R) = ${R}`,
        `■ 장착할 반대쪽 블레이드의 Radial Moment Weight 값 (P) = ${P}`,
        `■ 장탈된 블레이드의 Radial Moment Weight 값 (S) = ${S}`,
        `■ 장탈된 반대쪽 블레이드의 Radial Moment Weight 값 (O) = ${O}`,
        "",
        "[계산]",
        `■ R - P = ${(R - P).toFixed(2)}`,
        `■ S - O = ${(S - O).toFixed(2)}`,
        "",
        `■ Magnitude = (R - P) - (S - O) = ${mag.toFixed(2)}`
    ];

    if (Math.abs(mag) >= 7.0 && Math.abs(mag) <= 70.0) {
        lines.push("  (Magnitude 값이 +-7.0 oz.in ~ +-70.0 oz.in 범위 내에 있습니다.)");
    } else {
        lines.push("  (주의: Magnitude 값이 +-7.0 oz.in ~ +-70.0 oz.in 범위를 벗어났습니다!)");
    }

    lines.push(
        "",
        `■ Wn = Magnitude × 0.654 = ${mag.toFixed(4)} × 0.654 = ${Wn.toFixed(2)}`,
        "",
        `■ 허용 범위(±10%) = [${low.toFixed(2)}, ${high.toFixed(2)}]`,
        "",
        `■ 웨이트 기준 각도 = ${base_desc}`,
        ""
    );

    if (!selected) {
        lines.push("[결과] 허용 범위 내 일치 항목 없음");
    } else {
        const pn = WEIGHT_TO_PN[selected.weightG] || "N/A";
        lines.push(
            "[결과]",
            `■ 선택 위치 = ${selected.posLetter}  (Pitches from A = ${PITCHES_FROM_A[selected.posLetter]})`,
            "",
            `■ 선택 중량 = ${selected.weightG} oz·in (BAL TABLE 기준)`,
            "",
            `■ 표 값[oz·in] = ${selected.tval}`,
            "",
            `■ 장착 PN = ${pn}`,
            "",
            "* Weight의 장착위치가 Compensation Vector와 같은 경우에 Weight는 1개만 장착",
            "",
            "** (R-P) - (S-O) 값이 +-70.0 을 초과하는 경우 전체 블레이드 Re-parttern 필요"
        );
    }

    resultDisplay.innerHTML = lines.join('\n');
}

// Event Listeners
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        
        // Add active class to clicked
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

formMode1.addEventListener('submit', calculateMode1);
formMode2.addEventListener('submit', calculateMode2);

copyBtn.addEventListener('click', () => {
    const text = resultDisplay.innerText;
    if (text.includes("여기에 결과가 표시됩니다")) return;

    navigator.clipboard.writeText(text).then(() => {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('클립보드 복사에 실패했습니다.');
    });
});

// Initialize
drawBase();
