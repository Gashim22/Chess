import { useState, useEffect, useMemo } from "react";

// ═══════════════ ШАХМАТНЫЙ ДВИЖОК ═══════════════

const FILES = "abcdefgh";
const RANKS = "87654321";

function f2c(f) { return FILES.indexOf(f); }
function r2r(r) { return RANKS.indexOf(r); }
function c2f(c) { return FILES[c]; }
function r2n(r) { return RANKS[r]; }

export function initBoard() {
  return [
    ["br","bn","bb","bq","bk","bb","bn","br"],
    ["bp","bp","bp","bp","bp","bp","bp","bp"],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["","","","","","","",""],
    ["wp","wp","wp","wp","wp","wp","wp","wp"],
    ["wr","wn","wb","wq","wk","wb","wn","wr"],
  ];
}

function pathClear(b, fr, fc, tr, tc) {
  const dr = Math.sign(tr - fr);
  const dc = Math.sign(tc - fc);
  let r = fr + dr, c = fc + dc;
  while (r !== tr || c !== tc) {
    if (b[r][c]) return false;
    r += dr; c += dc;
  }
  return true;
}

function canMove(b, fr, fc, tr, tc, col, piece) {
  const dr = tr - fr, dc = tc - fc;
  const target = b[tr][tc];
  if (target && target[0] === col) return false;
  if (piece === "p") {
    const dir = col === "w" ? -1 : 1;
    const start = col === "w" ? 6 : 1;
    if (!dc && dr === dir && !target) return true;
    if (!dc && dr === 2 * dir && fr === start && !target && !b[fr + dir][fc]) return true;
    if (Math.abs(dc) === 1 && dr === dir && target && target[0] !== col) return true;
    return false;
  }
  if (piece === "n") {
    return (Math.abs(dc) === 2 && Math.abs(dr) === 1) ||
           (Math.abs(dc) === 1 && Math.abs(dr) === 2);
  }
  if (piece === "b") {
    return Math.abs(dc) === Math.abs(dr) && dc !== 0 && pathClear(b, fr, fc, tr, tc);
  }
  if (piece === "r") {
    return (dc === 0 || dr === 0) && (dc !== 0 || dr !== 0) && pathClear(b, fr, fc, tr, tc);
  }
  if (piece === "q") {
    return ((dc === 0 || dr === 0) || Math.abs(dc) === Math.abs(dr)) &&
           (dc !== 0 || dr !== 0) && pathClear(b, fr, fc, tr, tc);
  }
  if (piece === "k") {
    return Math.abs(dc) <= 1 && Math.abs(dr) <= 1 && (dc !== 0 || dr !== 0);
  }
  return false;
}

export function applyMove(board, san, col) {
  const b = board.map(r => [...r]);
  const m = san.replace(/[+#!?]/g, "");

  // Рокировки
  if (m === "O-O") {
    const row = col === "w" ? 7 : 0;
    b[row][4] = ""; b[row][7] = "";
    b[row][6] = col + "k"; b[row][5] = col + "r";
    return b;
  }
  if (m === "O-O-O") {
    const row = col === "w" ? 7 : 0;
    b[row][4] = ""; b[row][0] = "";
    b[row][2] = col + "k"; b[row][3] = col + "r";
    return b;
  }

  // Определяем тип фигуры
  let piece = "p";
  let rest = m;
  if ("RNBQK".includes(m[0])) { piece = m[0].toLowerCase(); rest = m.slice(1); }

  // Разбор disambiguation и целевой клетки
  let ff = null, fR = null, toSq;
  if (rest.includes("x")) {
    const [from, to] = rest.split("x");
    toSq = to.slice(0, 2);
    if (from.length === 1) { FILES.includes(from) ? (ff = from) : (fR = from); }
    else if (from.length === 2) { ff = from[0]; fR = from[1]; }
  } else {
    toSq = rest.slice(-2);
    const d = rest.slice(0, -2);
    if (d.length === 1) { FILES.includes(d) ? (ff = d) : (fR = d); }
    else if (d.length === 2) { ff = d[0]; fR = d[1]; }
  }

  const tc = f2c(toSq[0]);
  const tr = r2r(toSq[1]);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p || p[0] !== col || p[1] !== piece) continue;
      if (ff && c2f(c) !== ff) continue;
      if (fR && r2n(r) !== fR) continue;
      if (canMove(b, r, c, tr, tc, col, piece)) {
        // Продвижение пешки — авто-ферзь
        const promoted = piece === "p" && (tr === 0 || tr === 7) ? col + "q" : p;
        b[tr][tc] = promoted;
        b[r][c] = "";
        return b;
      }
    }
  }
  return b;
}

export function buildPositions(moves) {
  const positions = [{ board: initBoard(), mf: null, mt: null }];
  let board = initBoard();
  for (const mv of moves) {
    const nb = applyMove(board, mv.san, mv.color);
    let mf = null, mt = null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] && !nb[r][c] && !mf) mf = [r, c];
        if (nb[r][c] && (!board[r][c] || board[r][c][0] !== nb[r][c][0]) && !mt) mt = [r, c];
      }
    }
    board = nb;
    positions.push({ board: board.map(r => [...r]), mf, mt });
  }
  return positions;
}

// ═══════════════ SVG ФИГУРЫ ═══════════════

export function PieceSVG({ type, color }) {
  const w = color === "w";
  const fill   = w ? "#FFFFF0" : "#1C1008";
  const stroke = w ? "#806000" : "#D4A857";
  const g = { fill, stroke, strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" };

  const style = { width: "100%", height: "100%", display: "block" };

  if (type === "p") return (
    <svg viewBox="0 0 45 45" style={style}>
      <g {...g}>
        <circle cx="22.5" cy="12" r="5.5" />
        <path d="M20,19 C16,19 13,22 13,26 C12.5,27 12,28.5 12,30 C11.5,31.5 12,33 14,34 L31,34 C33,33 33.5,31.5 33,30 C33,28.5 32.5,27 32,26 C32,22 29,19 25,19 Z" />
        <path d="M11,37.5 H34 L32.5,34 H12.5 Z" />
      </g>
    </svg>
  );

  if (type === "r") return (
    <svg viewBox="0 0 45 45" style={style}>
      <g {...g}>
        <path d="M9,39 L36,39 L36,36 L33.5,36 L33.5,31.5 L35.5,31.5 L35.5,14 L30,14 L30,11 L26,11 L26,14 L19,14 L19,11 L15,11 L15,14 L9.5,14 L9.5,31.5 L11.5,31.5 L11.5,36 L9,36 Z" />
        <line x1="14" y1="31.5" x2="31" y2="31.5" stroke={w ? "#806000" : "#D4A857"} strokeWidth="1" />
      </g>
    </svg>
  );

  if (type === "n") return (
    <svg viewBox="0 0 45 45" style={style}>
      <g {...g}>
        <path d="M22,10 C18,10 14,12 12,16 C10,19 10,23 12,26 L15,29 C13,30 11,32 11,35 L11,39 L34,39 L34,35 C34,32 32,30 30,29 L26,26 C28,24 30,22 30,19 C30,14 27,10 22,10 Z" />
        <circle cx="18" cy="17" r="2" fill={w ? "#806000" : "#D4A857"} stroke="none" />
        <path d="M14,35 H31" strokeWidth="1" />
      </g>
    </svg>
  );

  if (type === "b") return (
    <svg viewBox="0 0 45 45" style={style}>
      <g {...g}>
        <circle cx="22.5" cy="8" r="3" />
        <path d="M22.5,11 C18,14 15,18 14,23 C13,27 13,31 14,34 L31,34 C32,31 32,27 31,23 C30,18 27,14 22.5,11 Z" />
        <line x1="14" y1="34" x2="31" y2="34" strokeWidth="1" />
        <path d="M11,37.5 H34 L32.5,34 H12.5 Z" />
      </g>
    </svg>
  );

  if (type === "q") return (
    <svg viewBox="0 0 45 45" style={style}>
      <g {...g}>
        <circle cx="6"    cy="12" r="2.5" />
        <circle cx="14"   cy="9"  r="2.5" />
        <circle cx="22.5" cy="8"  r="2.5" />
        <circle cx="31"   cy="9"  r="2.5" />
        <circle cx="39"   cy="12" r="2.5" />
        <path d="M9,26 C17.5,24.5 30,24.5 36,26 L39,12 L31,22 L28,9 L22.5,23 L17,9 L14,22 L6,12 Z" />
        <path d="M9,26 L10,33 L35,33 L36,26 Z" />
        <path d="M11,37.5 H34 L33,33 H12 Z" />
      </g>
    </svg>
  );

  if (type === "k") return (
    <svg viewBox="0 0 45 45" style={style}>
      <g {...g}>
        <line x1="22.5" y1="5"   x2="22.5" y2="14"  strokeWidth="2.5" />
        <line x1="18"   y1="8.5" x2="27"   y2="8.5"  strokeWidth="2.5" />
        <path d="M22.5,14 C18,17 14,21 13,26 L13,35 L32,35 L32,26 C31,21 27,17 22.5,14 Z" />
        <line x1="13" y1="30" x2="32" y2="30" strokeWidth="1" />
        <path d="M11,37.5 H34 L32,35 H13 Z" />
      </g>
    </svg>
  );

  return null;
}

// ═══════════════ КОМПОНЕНТ BOARD ═══════════════

const LIGHT = "#EEEED2";
const DARK  = "#769656";

function cellSize() {
  return Math.min(48, Math.floor((window.innerWidth - 28) / 8));
}

export function Board({ board, flipped, highlights = {}, onSquare, lastMoved, dotHints = [] }) {
  const [sz, setSz] = useState(cellSize);

  useEffect(() => {
    const handle = () => setSz(cellSize());
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const rows = flipped ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];
  const cols = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

  function squareBg(r, c) {
    const key = `${r},${c}`;
    if (highlights[key] === "selected") return "#4A90D9";
    if (highlights[key] === "hint")     return "#E67E22";
    const isLight = (r + c) % 2 === 0;
    if (lastMoved && (
      (lastMoved.mf && lastMoved.mf[0] === r && lastMoved.mf[1] === c) ||
      (lastMoved.mt && lastMoved.mt[0] === r && lastMoved.mt[1] === c)
    )) return isLight ? "#F6F669" : "#BACA44";
    return isLight ? LIGHT : DARK;
  }

  const dotSet = new Set(dotHints.map(([r,c]) => `${r},${c}`));

  const totalSize = sz * 8;

  return (
    <div style={{ display: "inline-block", userSelect: "none" }}>
      {/* Буквы сверху */}
      <div style={{ display: "flex", paddingLeft: sz + "px" }}>
        {cols.map(c => (
          <div key={c} style={{
            width: sz, textAlign: "center", fontSize: sz * 0.22,
            color: "#888", fontWeight: 600, lineHeight: "1.4"
          }}>
            {FILES[c]}
          </div>
        ))}
      </div>

      <div style={{ display: "flex" }}>
        {/* Цифры слева */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {rows.map(r => (
            <div key={r} style={{
              width: sz, height: sz, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: sz * 0.22, color: "#888", fontWeight: 600
            }}>
              {RANKS[r]}
            </div>
          ))}
        </div>

        {/* Клетки доски */}
        <div style={{ position: "relative", width: totalSize, height: totalSize }}>
          {rows.map((r, ri) =>
            cols.map((c, ci) => {
              const piece = board[r][c];
              const bg = squareBg(r, c);
              const isDot = dotSet.has(`${r},${c}`);
              return (
                <div
                  key={`${r},${c}`}
                  onClick={() => onSquare && onSquare(r, c)}
                  style={{
                    position: "absolute",
                    left: ci * sz, top: ri * sz,
                    width: sz, height: sz,
                    background: bg,
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                >
                  {/* Точка-подсказка */}
                  {isDot && !piece && (
                    <div style={{
                      position: "absolute",
                      top: "50%", left: "50%",
                      transform: "translate(-50%,-50%)",
                      width: sz * 0.28, height: sz * 0.28,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.18)",
                      pointerEvents: "none",
                    }} />
                  )}
                  {/* Фигура */}
                  {piece && (
                    <div style={{ width: "100%", height: "100%", padding: sz * 0.04 + "px", boxSizing: "border-box" }}>
                      <PieceSVG type={piece[1]} color={piece[0]} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Буквы снизу */}
      <div style={{ display: "flex", paddingLeft: sz + "px" }}>
        {cols.map(c => (
          <div key={c} style={{
            width: sz, textAlign: "center", fontSize: sz * 0.22,
            color: "#888", fontWeight: 600, lineHeight: "1.4"
          }}>
            {FILES[c]}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════ ДАННЫЕ ДЕБЮТОВ ═══════════════

const OPENINGS = [
  {
    id: "sicilian", name: "Сицилианская защита", emoji: "🛡️",
    playAs: "black", color: "#9B59B6",
    desc: "1...c5 — асимметричная борьба за центр.",
    idea: "Чёрные отвечают 1...c5, создавая асимметрию вместо зеркального e5. Борьба ведётся за поле d4 с фланга, а полуоткрытая линия c даёт богатую контригру ладьёй. Это самый популярный и изученный дебютный комплекс в шахматах.",
    variations: [
      {
        id: "najdorf", name: "Вариант Найдорфа", eco: "B90",
        moves: [
          {san:"e4",color:"w",note:"Занимаем центр, открываем диагонали для слонов"},
          {san:"c5",color:"b",note:"⭐ Сицилианская — борьба за поле d4 с фланга"},
          {san:"Nf3",color:"w",note:"Развиваем коня, атакуем пешку e5 в перспективе"},
          {san:"d6",color:"b",note:"Контролируем поле e5, готовим развитие слона"},
          {san:"d4",color:"w",note:"Вскрываем центр, завоёвываем инициативу"},
          {san:"cxd4",color:"b",note:"⭐ Берём пешку, открываем линию c для ладьи"},
          {san:"Nxd4",color:"w",note:"Конь занимает мощный центральный форпост"},
          {san:"Nf6",color:"b",note:"Развиваем коня, нападаем на пешку e4"},
          {san:"Nc3",color:"w",note:"Защищаем e4, развиваем коня на активную позицию"},
          {san:"a6",color:"b",note:"⭐ Найдорф — блокируем Nb5, готовим b5 и Bb7"},
        ],
        quiz: [
          {q:"Цель 5...a6?", opts:["Ошибка","Блокируем Nb5 и готовим b5","Защита","Ладья"], ans:1, exp:"a6 предотвращает Nb5 и готовит b5."},
          {q:"3...cxd4 даёт?", opts:["Ничего","Линию c","Пешку","Слабость"], ans:1, exp:"Полуоткрытая линия c — ключевой актив."},
          {q:"Кто апологет Найдорфа?", opts:["Карпов","Фишер и Каспаров","Таль","Петросян"], ans:1, exp:"Фишер и Каспаров играли Найдорф всю карьеру."},
        ]
      },
      {
        id: "dragon", name: "Вариант Дракона", eco: "B70",
        moves: [
          {san:"e4",color:"w",note:"Занимаем центр, открываем диагонали для слонов"},
          {san:"c5",color:"b",note:"Сицилианская — борьба за d4 с фланга"},
          {san:"Nf3",color:"w",note:"Развиваем коня на активное поле"},
          {san:"d6",color:"b",note:"Укрепляем e5, готовим развитие фигур"},
          {san:"d4",color:"w",note:"Вскрываем центр, захватываем пространство"},
          {san:"cxd4",color:"b",note:"Берём пешку, открываем линию c для ладьи"},
          {san:"Nxd4",color:"w",note:"Конь занимает центральный форпост d4"},
          {san:"Nf6",color:"b",note:"Атакуем пешку e4, развиваем коня"},
          {san:"Nc3",color:"w",note:"Защищаем e4, развиваем коня"},
          {san:"g6",color:"b",note:"⭐ Дракон — готовим фианкетто слона"},
          {san:"Be3",color:"w",note:"Развиваем слона, контролируем d4"},
          {san:"Bg7",color:"b",note:"⭐ Драконий слон давит по диагонали a1-h8"},
        ],
        quiz: [
          {q:"Почему Дракон?", opts:["Агрессивность","Пешки + Bg7 = дракон","Изобретатель","Случайно"], ans:1, exp:"Структура g6,f7,e5,d6 с Bg7 напоминает дракона."},
          {q:"Сила Bg7?", opts:["Защита","Давление по диагонали a1-h8","Нет","f2"], ans:1, exp:"Слон давит на ферзевый фланг белых."},
          {q:"Атака белых в Драконе?", opts:["Ферзевый","Юго-Вест g4-g5-h5","Центр","a4-a5"], ans:1, exp:"Be3, Qd2, 0-0-0, g4-g5-h5 — классика."},
        ]
      },
    ]
  },
  {
    id: "spanish", name: "Испанская партия", emoji: "🏰",
    playAs: "white", color: "#C0392B",
    desc: "3.Bb5 — давление на защитника e5.",
    idea: "Белые на третьем ходу атакуют коня c6, который защищает пешку e5. Угроза Bxc6 с последующим Nxe5 создаёт постоянное давление, вынуждая чёрных к точной игре. Испанская — дебют позиционного превосходства, любимый оружие Карпова и Фишера.",
    variations: [
      {
        id: "closed", name: "Закрытый вариант", eco: "C84",
        moves: [
          {san:"e4",color:"w",note:"⭐ Открытый дебют — центр и быстрое развитие"},
          {san:"e5",color:"b",note:"Симметричный ответ, борьба за центр"},
          {san:"Nf3",color:"w",note:"Атакуем пешку e5, развиваем коня"},
          {san:"Nc6",color:"b",note:"Защищаем e5, развиваем коня на лучшее поле"},
          {san:"Bb5",color:"w",note:"⭐ Испанская — давление на защитника e5"},
          {san:"a6",color:"b",note:"⭐ Ход Морфи — прогоняем слона с b5"},
          {san:"Ba4",color:"w",note:"Слон отступает, сохраняя давление на c6"},
          {san:"Nf6",color:"b",note:"Развиваем коня, атакуем пешку e4"},
          {san:"O-O",color:"w",note:"Рокируемся, готовим ладью к атаке по линии e"},
          {san:"Be7",color:"b",note:"Готовим рокировку, развиваем слона"},
          {san:"Re1",color:"w",note:"⭐ Ладья давит на e5 по полуоткрытой линии"},
        ],
        quiz: [
          {q:"Bb5 — смысл?", opts:["Атака","Давление на Nc6, защищающего e5","Развитие","Рокировка"], ans:1, exp:"Bb5 угрожает взять Nc6 и выиграть e5."},
          {q:"a6 — зачем?", opts:["Ошибка","Прогнать слона b5","Центр","Ладья"], ans:1, exp:"a6 прогоняет слона на a4."},
          {q:"Re1 — цель?", opts:["Защита","Давление на e5 по линии e","Атака f7","Рокировка"], ans:1, exp:"Ладья усиливает давление на e5."},
        ]
      },
      {
        id: "berlin", name: "Берлинская стена", eco: "C65",
        moves: [
          {san:"e4",color:"w",note:"Открываем центр, начинаем открытую игру"},
          {san:"e5",color:"b",note:"Занимаем центр, ограничиваем коня f3"},
          {san:"Nf3",color:"w",note:"Атакуем пешку e5, развиваем коня"},
          {san:"Nc6",color:"b",note:"Защищаем e5 конём на лучшее поле"},
          {san:"Bb5",color:"w",note:"Испанская — давление на защитника e5"},
          {san:"Nf6",color:"b",note:"⭐ Берлин — конь атакует e4 вместо a6"},
          {san:"O-O",color:"w",note:"Рокируемся, готовим Re1"},
          {san:"Nxe4",color:"b",note:"⭐ Берём пешку e4, принимаем вызов"},
          {san:"d4",color:"w",note:"Контратакуем центр, отыгрываем материал"},
          {san:"Nd6",color:"b",note:"Отступаем конём, защищаем e5"},
          {san:"Bxc6",color:"w",note:"Разрушаем пешечную структуру чёрных"},
          {san:"dxc6",color:"b",note:"Берём слоном, принимаем сдвоенные пешки"},
          {san:"dxe5",color:"w",note:"Выигрываем пешку e5"},
        ],
        quiz: [
          {q:"Почему Берлин — стена?", opts:["Нет смысла","Надёжная структура после размена ферзей","Случайно","Имя"], ans:1, exp:"После Qxd8 позиция черных почти неприступна."},
          {q:"Кто popularизировал?", opts:["Фишер","Крамник — матч 2000","Таль","Карпов"], ans:1, exp:"Крамник выиграл матч у Каспарова 2000 через Берлин."},
          {q:"Преимущество?", opts:["Острота","Надёжность, лёгкое уравнение","Атака","Мат"], ans:1, exp:"Лёгкое уравнение в надёжном эндшпиле."},
        ]
      },
    ]
  },
  {
    id: "london", name: "Лондонская система", emoji: "🎭",
    playAs: "white", color: "#8E44AD",
    desc: "1.d4 2.Nf3 3.Bf4 — надёжность без теории.",
    idea: "Белые строят надёжную пирамидальную структуру: d4, Nf3, Bf4, e3, Nbd2. Система универсальна — работает против большинства ответов чёрных без глубокого знания теории. Любимый дебют Магнуса Карлсена на быстрых шахматах.",
    variations: [
      {
        id: "classical", name: "Классическая", eco: "D02",
        moves: [
          {san:"d4",color:"w",note:"Захватываем центр, открываем диагонали"},
          {san:"d5",color:"b",note:"Симметрично занимаем центр"},
          {san:"Nf3",color:"w",note:"Развиваем коня на лучшее поле"},
          {san:"Nf6",color:"b",note:"Развиваем коня, атакуем d4"},
          {san:"Bf4",color:"w",note:"⭐ Лондонский слон — ключевой ход системы"},
          {san:"e6",color:"b",note:"Строим надёжную пешечную структуру"},
          {san:"e3",color:"w",note:"Укрепляем центр, открываем диагональ для Bd3"},
          {san:"Bd6",color:"b",note:"Атакуем слона f4, предлагая размен"},
          {san:"Bg3",color:"w",note:"Слон отступает, сохраняя позицию"},
          {san:"O-O",color:"b",note:"Рокируемся, завершаем развитие"},
          {san:"Nbd2",color:"w",note:"⭐ Конь на d2 — гибкая позиция для манёвра"},
        ],
        quiz: [
          {q:"Ключевой ход Лондона?", opts:["d4","3.Bf4 — лондонский слон","e3","Nbd2"], ans:1, exp:"Bf4 — основа лондонской системы."},
          {q:"Преимущество?", opts:["Теория","Без зубрёжки — надёжная позиция","Острота","Мат"], ans:1, exp:"Минимум теории, максимум надёжности."},
          {q:"Карлсен играет?", opts:["Нет","Да — регулярно на высшем уровне","Редко","Только блиц"], ans:1, exp:"Карлсен применяет Лондон и побеждает сильнейших."},
        ]
      },
      {
        id: "vs_kid", name: "Против КИЗ", eco: "A45",
        moves: [
          {san:"d4",color:"w",note:"Захватываем центр, начинаем лондонскую"},
          {san:"Nf6",color:"b",note:"Развиваем коня, готовим КИЗ структуру"},
          {san:"Nf3",color:"w",note:"Развиваем коня, атакуем центр"},
          {san:"g6",color:"b",note:"Готовим фианкетто — КИЗ структура"},
          {san:"Bf4",color:"w",note:"⭐ Лондон против КИЗ — избегаем острой теории"},
          {san:"Bg7",color:"b",note:"⭐ Фианкетто слона — сила КИЗ"},
          {san:"e3",color:"w",note:"Укрепляем центр, готовим Bd3"},
          {san:"d6",color:"b",note:"Строим КИЗ структуру d6-e5"},
          {san:"h3",color:"w",note:"⭐ Блокируем Bg4, не даём связать коня f3"},
          {san:"O-O",color:"b",note:"Рокируемся, завершаем развитие"},
          {san:"Be2",color:"w",note:"Развиваем слона, готовимся к рокировке"},
        ],
        quiz: [
          {q:"h3 зачем?", opts:["Атака","Блокируем Bg4 — не свяжут Nf3","Защита","Ошибка"], ans:1, exp:"h3 предотвращает Bg4 и связку коня f3."},
          {q:"Лондон против КИЗ?", opts:["Плохо","Избегаем острой теории КИЗ","Не работает","Ошибка"], ans:1, exp:"Надёжная позиция без знания теории КИЗ."},
          {q:"Универсальность?", opts:["Только d5","Против d5, Nf6, g6 — одна схема","Только e5","Нет"], ans:1, exp:"Одна система против многих ответов черных."},
        ]
      },
    ]
  },
  {
    id: "catalan", name: "Каталонское начало", emoji: "🏔️",
    playAs: "white", color: "#3498DB",
    desc: "3.g3 Bg2 — каталонский слон давит на ферзевый фланг.",
    idea: "Белые сочетают ферзевый гамбит с фианкетто слона на g2. Слон g2 давит по длинной диагонали a8-h1, создавая постоянное давление на ферзевый фланг чёрных. Каталон — любимый дебют Крамника и Карлсена в классических партиях.",
    variations: [
      {
        id: "open", name: "Открытый (dxc4)", eco: "E04",
        moves: [
          {san:"d4",color:"w",note:"Захватываем центр, начинаем каталон"},
          {san:"d5",color:"b",note:"Симметрично занимаем центр"},
          {san:"c4",color:"w",note:"Ферзевый гамбит — атакуем пешку d5"},
          {san:"e6",color:"b",note:"Защищаем d5, строим надёжную структуру"},
          {san:"Nf3",color:"w",note:"Развиваем коня на лучшее центральное поле"},
          {san:"Nf6",color:"b",note:"Развиваем коня, атакуем центр"},
          {san:"g3",color:"w",note:"⭐ Каталон — готовим фианкетто слона"},
          {san:"Be7",color:"b",note:"Развиваем слона, готовим рокировку"},
          {san:"Bg2",color:"w",note:"⭐ Каталонский слон — давит по диагонали a8-h1"},
          {san:"O-O",color:"b",note:"Рокируемся, убираем короля в безопасность"},
          {san:"O-O",color:"w",note:"Рокируемся, слон g2 активирован"},
          {san:"dxc4",color:"b",note:"⭐ Открытый вариант — берём пешку c4"},
          {san:"Qc2",color:"w",note:"Атакуем пешку c4, готовим её возврат"},
        ],
        quiz: [
          {q:"Каталонский слон?", opts:["Любой","Слон g2 — давит по a8-h1","c1 слон","Ферзь"], ans:1, exp:"Слон g2 давит на ферзевый фланг по длинной диагонали."},
          {q:"dxc4 для черных?", opts:["Ошибка","Лишняя пешка c4","Слабость","Центр"], ans:1, exp:"Черные берут пешку — нужно её точно защищать."},
          {q:"Кто popularизировал?", opts:["Алехин","Крамник и Карлсен","Таль","Фишер"], ans:1, exp:"Крамник и Карлсен — главные мастера каталона."},
        ]
      },
      {
        id: "closed", name: "Закрытый (c6)", eco: "E06",
        moves: [
          {san:"d4",color:"w",note:"Захватываем центр, начинаем ферзевый дебют"},
          {san:"d5",color:"b",note:"Отвечаем на центр, держим поле e4"},
          {san:"c4",color:"w",note:"Ферзевый гамбит — атака на d5"},
          {san:"e6",color:"b",note:"Укрепляем d5, строим структуру"},
          {san:"Nf3",color:"w",note:"Развиваем коня на лучшее поле"},
          {san:"Nf6",color:"b",note:"Развиваем коня, контролируем центр"},
          {san:"g3",color:"w",note:"Каталон — готовим фианкетто"},
          {san:"Be7",color:"b",note:"Развиваем слона, готовим рокировку"},
          {san:"Bg2",color:"w",note:"Каталонский слон — давление по диагонали"},
          {san:"O-O",color:"b",note:"Рокируемся, завершаем развитие"},
          {san:"O-O",color:"w",note:"Рокируемся, слон g2 активен"},
          {san:"c6",color:"b",note:"⭐ Закрытый вариант — укрепляем d5 без потери c4"},
          {san:"Qc2",color:"w",note:"Давление на d5 и всю позицию чёрных"},
        ],
        quiz: [
          {q:"c6 — идея?", opts:["Ошибка","Надёжная защита без потери пешки","Атака","Ладья"], ans:1, exp:"c6 укрепляет d5, не отдаёт пешку c4."},
          {q:"Закрытый для кого?", opts:["Тактиков","Позиционных — Петросян, Карпов","Всех","Начинающих"], ans:1, exp:"Позиционные игроки предпочитают закрытый каталон."},
          {q:"Слон g2 в закрытой позиции?", opts:["Бесполезен","Ждёт вскрытия — потом прорывается","Нет роли","Защита"], ans:1, exp:"Слон временно ограничен, но обретает силу при вскрытии."},
        ]
      },
    ]
  },
  {
    id: "grunfeld", name: "Защита Грюнфельда", emoji: "🐉",
    playAs: "black", color: "#27AE60",
    desc: "1...d5 против 1.d4 — отдаём центр и разрушаем его слоном g7.",
    idea: "Чёрные сознательно уступают центр белым, а затем атакуют его гиперсовременными методами. Слон g7 по диагонали a1-h8 давит на центральные пешки, а удары c5 и e5 разрушают позицию белых. Это дебют Каспарова — он использовал его во всех матчах с Карповым.",
    variations: [
      {
        id: "exchange", name: "Разменный вариант", eco: "D85",
        moves: [
          {san:"d4",color:"w",note:"Начало"},
          {san:"Nf6",color:"b",note:"Развитие"},
          {san:"c4",color:"w",note:"Атака фланга"},
          {san:"g6",color:"b",note:"⭐ Фианкетто"},
          {san:"Nc3",color:"w",note:"Развитие"},
          {san:"d5",color:"b",note:"⭐ Грюнфельд!"},
          {san:"cxd5",color:"w",note:"Размен центра"},
          {san:"Nxd5",color:"b",note:"Конь центр"},
          {san:"e4",color:"w",note:"⭐ Большой центр"},
          {san:"Nxc3",color:"b",note:"Разрушаем пешки"},
          {san:"bxc3",color:"w",note:"Пешечный центр"},
          {san:"Bg7",color:"b",note:"⭐ Слон давит!"},
          {san:"Bc4",color:"w",note:"Активный слон"},
        ],
        quiz: [
          {q:"Философия Грюнфельда?", opts:["Держать центр","⭐ Отдать — потом атаковать","Рокировка","Атака фланга"], ans:1, exp:"Черные сознательно уступают центр, чтобы атаковать его слоном g7 и ударами c5."},
          {q:"Роль слона g7?", opts:["Защита","⭐ Атакует центр по диагонали h8-a1","Нет роли","Ладья"], ans:1, exp:"Слон g7 — главное оружие Грюнфельда, давит на пешки c3, d4, e4."},
          {q:"После Nxc3 bxc3 у белых?", opts:["Ничего","⭐ Три центральные пешки c3+d4+e4","Слабость","Конь"], ans:1, exp:"Большой центр — и сила, и мишень для атаки черных."},
        ]
      },
      {
        id: "russian", name: "Русская система", eco: "D97",
        moves: [
          {san:"d4",color:"w",note:"Начало"},
          {san:"Nf6",color:"b",note:"Развитие"},
          {san:"c4",color:"w",note:"Атака фланга"},
          {san:"g6",color:"b",note:"Фианкетто"},
          {san:"Nc3",color:"w",note:"Развитие"},
          {san:"d5",color:"b",note:"Грюнфельд"},
          {san:"Nf3",color:"w",note:"Развитие"},
          {san:"Bg7",color:"b",note:"⭐ Слон активен"},
          {san:"Qb3",color:"w",note:"⭐ Русская — давление!"},
          {san:"dxc4",color:"b",note:"Берём пешку"},
          {san:"Qxc4",color:"w",note:"Ферзь берёт"},
          {san:"O-O",color:"b",note:"Рокировка"},
          {san:"e4",color:"w",note:"Центр"},
        ],
        quiz: [
          {q:"Цель Qb3?", opts:["Развитие","⭐ Давление на d5 и b7 одновременно","Защита","Ошибка"], ans:1, exp:"Qb3 атакует пешку d5 и пешку b7 одновременно, создавая двойное давление."},
          {q:"Ответ на Qb3?", opts:["Qxb3","⭐ dxc4 — берём пешку","d4","e6"], ans:1, exp:"dxc4 берёт пешку и вскрывает центр в выгодный момент."},
          {q:"Кто разработал систему?", opts:["Ботвинник","⭐ Советская школа, Каспаров","Фишер","Алёхин"], ans:1, exp:"Русскую систему активно разрабатывала советская школа; Каспаров применял её в матчах с Карповым."},
        ]
      },
    ]
  },
  {
    id: "kid", name: "Старо-Индийская защита", emoji: "⚡",
    playAs: "black", color: "#E67E22",
    desc: "1...g6 2...Bg7 — крепость и атака на королевском фланге.",
    idea: "Чёрные строят крепкую позицию с фианкетто слона g7, а затем начинают штурм королевского фланга. Пока белые атакуют на ферзевом, чёрные бьют по королю: f5-f4, g5-h5. Каспаров, Фишер и Бронштейн сделали СЗИ символом динамичной контригры.",
    variations: [
      {
        id: "classical_kid", name: "Классическая система", eco: "E92",
        moves: [
          {san:"d4",color:"w",note:"Начало"},
          {san:"Nf6",color:"b",note:"Развитие"},
          {san:"c4",color:"w",note:"Атака"},
          {san:"g6",color:"b",note:"Фианкетто"},
          {san:"Nc3",color:"w",note:"Развитие"},
          {san:"Bg7",color:"b",note:"⭐ Слон на g7"},
          {san:"e4",color:"w",note:"Большой центр"},
          {san:"d6",color:"b",note:"⭐ СЗИ структура"},
          {san:"Nf3",color:"w",note:"Развитие"},
          {san:"O-O",color:"b",note:"Рокировка"},
          {san:"Be2",color:"w",note:"Классика"},
          {san:"e5",color:"b",note:"⭐ Центр!"},
          {san:"O-O",color:"w",note:"Рокировка"},
        ],
        quiz: [
          {q:"План черных в классике?", opts:["Ждать","⭐ Атака f5-f4 на королевском","Центр","Эндшпиль"], ans:1, exp:"Черные атакуют через f5-f4, белые отвечают через c5 на ферзевом фланге."},
          {q:"Зачем e5?", opts:["Атака e4","⭐ Захват центра, база для f5","Слон","Защита"], ans:1, exp:"e5 создаёт форпост и плацдарм для атаки через f5-f4."},
          {q:"Каспаров и СЗИ?", opts:["Редко","⭐ Главное оружие за чёрных","Молодость","Никогда"], ans:1, exp:"Каспаров сделал Старо-Индийскую своим главным оружием за чёрных."},
        ]
      },
      {
        id: "mar_del_plata", name: "Мар-дель-Плата", eco: "E99",
        moves: [
          {san:"d4",color:"w",note:"Начало"},
          {san:"Nf6",color:"b",note:"Развитие"},
          {san:"c4",color:"w",note:"Атака"},
          {san:"g6",color:"b",note:"Фианкетто"},
          {san:"Nc3",color:"w",note:"Развитие"},
          {san:"Bg7",color:"b",note:"Слон"},
          {san:"e4",color:"w",note:"Центр"},
          {san:"d6",color:"b",note:"Структура"},
          {san:"Nf3",color:"w",note:"Конь"},
          {san:"O-O",color:"b",note:"Рокировка"},
          {san:"Be2",color:"w",note:"Классика"},
          {san:"e5",color:"b",note:"Центр"},
          {san:"O-O",color:"w",note:"Рокировка"},
          {san:"Nc6",color:"b",note:"Развитие"},
          {san:"d5",color:"w",note:"Закрытие"},
          {san:"Ne7",color:"b",note:"Конь"},
          {san:"Nd2",color:"w",note:"Подготовка c5"},
          {san:"f5",color:"b",note:"⭐ Штурм!"},
        ],
        quiz: [
          {q:"Цель f5?", opts:["Ошибка","⭐ Штурм королевского фланга f4-g5","Слон","Защита e5"], ans:1, exp:"f5 начинает штурм: f4, g5, Ng6 с матовыми угрозами на короля белых."},
          {q:"Почему d5 ведёт к Мар-дель-Плата?", opts:["Случайно","⭐ Закрытый центр — атакуй на фланге","Защита","Ферзь"], ans:1, exp:"После d5 центр закрыт, и черные немедленно начинают штурм через f5."},
          {q:"Назван в честь?", opts:["Гроссмейстера","⭐ Аргентинского города, турнир 1953","Испании","Страны"], ans:1, exp:"Вариант получил имя на турнире в Мар-дель-Плата (Аргентина) в 1953 году."},
        ]
      },
    ]
  },
  {
    id: "english", name: "Английское начало", emoji: "🎩",
    playAs: "white", color: "#1ABC9C",
    desc: "1.c4 — фланговый дебют, гибкий контроль центра.",
    idea: "Белые начинают с фланга, избегая прямого столкновения в центре. c4 контролирует d5 косвенно, сохраняя гибкость. Английское часто транспонирует в другие дебюты — ферзевый гамбит, нимцович. Ботвинник, Карпов и Крамник применяли его как универсальное оружие.",
    variations: [
      {
        id: "symmetric", name: "Симметричный вариант", eco: "A30",
        moves: [
          {san:"c4",color:"w",note:"⭐ Английское!"},
          {san:"c5",color:"b",note:"Симметрия"},
          {san:"Nc3",color:"w",note:"Развитие"},
          {san:"Nf6",color:"b",note:"Развитие"},
          {san:"g3",color:"w",note:"⭐ Фианкетто"},
          {san:"d5",color:"b",note:"Центр"},
          {san:"cxd5",color:"w",note:"Размен"},
          {san:"Nxd5",color:"b",note:"Конь центр"},
          {san:"Bg2",color:"w",note:"⭐ Слон g2"},
          {san:"Nc7",color:"b",note:"Конь отступает"},
          {san:"Nf3",color:"w",note:"Развитие"},
          {san:"Nc6",color:"b",note:"Развитие"},
          {san:"O-O",color:"w",note:"Рокировка"},
        ],
        quiz: [
          {q:"Идея g3 в английском?", opts:["Атака","⭐ Фианкетто слона, давление на d5","Защита","Пешка"], ans:1, exp:"g3 подготавливает фианкетто Bg2, откуда слон давит на центр и ферзевый фланг."},
          {q:"Стиль английского?", opts:["Острый","⭐ Позиционный, манёвренный","Гамбитный","Атака"], ans:1, exp:"Английское начало — позиционный дебют без ранних острых столкновений."},
          {q:"Кто применяет английское?", opts:["Только начинающие","⭐ Карлсен, Крамник, Ботвинник","Таль","Фишер"], ans:1, exp:"Английское любят позиционные гроссмейстеры: Ботвинник, Крамник, Карлсен."},
        ]
      },
      {
        id: "e5_variation", name: "Вариант с 1...e5", eco: "A22",
        moves: [
          {san:"c4",color:"w",note:"Английское"},
          {san:"e5",color:"b",note:"⭐ Не симметрия — e5!"},
          {san:"Nc3",color:"w",note:"Развитие"},
          {san:"Nf6",color:"b",note:"Развитие"},
          {san:"g3",color:"w",note:"Фианкетто"},
          {san:"d5",color:"b",note:"Центр"},
          {san:"cxd5",color:"w",note:"Размен"},
          {san:"Nxd5",color:"b",note:"Конь"},
          {san:"Bg2",color:"w",note:"⭐ Слон g2"},
          {san:"Nb6",color:"b",note:"Конь на b6"},
          {san:"Nf3",color:"w",note:"Развитие"},
          {san:"Nc6",color:"b",note:"Развитие"},
          {san:"O-O",color:"w",note:"Рокировка"},
        ],
        quiz: [
          {q:"1...e5 против 1.c4?", opts:["Ошибка","⭐ Контроль центра, асимметрия","Слабость","Нет идеи"], ans:1, exp:"e5 создаёт асимметричный центр и даёт чёрным активную контригру."},
          {q:"Слон g2 давит?", opts:["На f7","⭐ По диагонали a8-h1","На d5","На e5"], ans:1, exp:"Слон g2 давит по длинной диагонали, особенно на d5 и ферзевый фланг."},
          {q:"Минус 1.c4 по сравнению с e4/d4?", opts:["Нет","⭐ Меньше прямого контроля центра","Слабость","Развитие"], ans:1, exp:"c4 контролирует центр косвенно, что даёт чёрным больше гибкости."},
        ]
      },
    ]
  },
  {
    id: "french", name: "Французская защита", emoji: "🥐",
    playAs: "black", color: "#F39C12",
    desc: "1...e6 — надёжная структура с контратакой d5.",
    idea: "Чёрные строят надёжную крепость e6-d5 и ждут момента для контратаки c5. Структура прочна, но ценой ограниченного слона c8. Французская — выбор позиционных игроков, любивших её Петросян, Карпов и Корчной.",
    variations: [
      {
        id: "tarrasch", name: "Тарраш", eco: "C05",
        moves: [
          {san:"e4",color:"w",note:"Центр"},
          {san:"e6",color:"b",note:"⭐ Французская!"},
          {san:"d4",color:"w",note:"Центр"},
          {san:"d5",color:"b",note:"Контратака"},
          {san:"Nd2",color:"w",note:"⭐ Тарраш"},
          {san:"Nf6",color:"b",note:"Развитие"},
          {san:"e5",color:"w",note:"Захват пространства"},
          {san:"Nfd7",color:"b",note:"Конь отходит"},
          {san:"Bd3",color:"w",note:"Слон"},
          {san:"c5",color:"b",note:"⭐ Подрыв центра"},
          {san:"c3",color:"w",note:"Укрепление"},
          {san:"Nc6",color:"b",note:"Развитие"},
          {san:"Ne2",color:"w",note:"Конь"},
          {san:"cxd4",color:"b",note:"Размен"},
          {san:"cxd4",color:"w",note:"Берём"},
        ],
        quiz: [
          {q:"Идея Тарраша (Nd2)?", opts:["Ошибка","⭐ Не блокировать слона c1","Защита","Атака"], ans:1, exp:"Nd2 вместо Nc3 не блокирует слона c1, сохраняя гибкость."},
          {q:"Ответ на e5 в Тарраше?", opts:["Просто ждать","⭐ c5 — подрыв пешечного центра","f6","Nc6"], ans:1, exp:"c5 атакует базу центра белых d4, создавая контригру."},
          {q:"Слабость французской структуры?", opts:["Нет","⭐ Слон c8 ограничен пешкой e6","Ферзь","Ладья"], ans:1, exp:"Слон c8 ограничен собственной пешкой e6 — это главная проблема французской."},
        ]
      },
      {
        id: "winawer", name: "Атака Винавера", eco: "C18",
        moves: [
          {san:"e4",color:"w",note:"Центр"},
          {san:"e6",color:"b",note:"Французская"},
          {san:"d4",color:"w",note:"Центр"},
          {san:"d5",color:"b",note:"Контратака"},
          {san:"Nc3",color:"w",note:"Развитие"},
          {san:"Bb4",color:"b",note:"⭐ Винавер — связка!"},
          {san:"e5",color:"w",note:"Пространство"},
          {san:"c5",color:"b",note:"Подрыв"},
          {san:"a3",color:"w",note:"Прогнать слона"},
          {san:"Bxc3",color:"b",note:"⭐ Размен на c3"},
          {san:"bxc3",color:"w",note:"Сдвоенные пешки"},
          {san:"Qc7",color:"b",note:"Ферзь активен"},
          {san:"Nf3",color:"w",note:"Развитие"},
          {san:"Ne7",color:"b",note:"Развитие"},
          {san:"a4",color:"w",note:"Фланговая игра"},
        ],
        quiz: [
          {q:"Цель Bb4 в Винавере?", opts:["Развитие","⭐ Связка Nc3, сдвоить пешки белых","Защита","Ошибка"], ans:1, exp:"Bb4 связывает коня c3 и угрожает сдвоить пешки белых после Bxc3."},
          {q:"После Bxc3 bxc3 у белых?", opts:["Преимущество","⭐ Сдвоенные пешки, но пространство","Ничего","Мат"], ans:1, exp:"Сдвоенные пешки c3 — слабость, но пространство e5 — компенсация."},
          {q:"Характер Винавера?", opts:["Тихий","⭐ Острый, обоюдный риск","Эндшпиль","Позиционный"], ans:1, exp:"Один из самых острых вариантов французской — обе стороны атакуют."},
        ]
      },
    ]
  },
  {
    id: "nimzo", name: "Защита Нимцовича", emoji: "♝",
    playAs: "black", color: "#2980B9",
    desc: "3...Bb4 — слон берёт коня, стратегическая битва за центр.",
    idea: "Чёрные пришпиливают коня c3 слоном b4, угрожая сдвоить пешки белых после Bxc3. Это чисто стратегический дебют без прямых атак — борьба за слабые поля. Нимцович изобрёл его как часть «гиперсовременной» революции в шахматах 1920-х годов.",
    variations: [
      {
        id: "rubinstein", name: "Система Рубинштейна", eco: "E40",
        moves: [
          {san:"d4",color:"w",note:"Начало"},
          {san:"Nf6",color:"b",note:"Развитие"},
          {san:"c4",color:"w",note:"Атака"},
          {san:"e6",color:"b",note:"Структура"},
          {san:"Nc3",color:"w",note:"Развитие"},
          {san:"Bb4",color:"b",note:"⭐ Нимцович!"},
          {san:"e3",color:"w",note:"⭐ Рубинштейн"},
          {san:"O-O",color:"b",note:"Рокировка"},
          {san:"Bd3",color:"w",note:"Слон"},
          {san:"d5",color:"b",note:"Центр"},
          {san:"Nf3",color:"w",note:"Развитие"},
          {san:"c5",color:"b",note:"⭐ Подрыв центра"},
          {san:"O-O",color:"w",note:"Рокировка"},
          {san:"Nc6",color:"b",note:"Развитие"},
          {san:"a3",color:"w",note:"Прогнать слона"},
          {san:"Bxc3",color:"b",note:"Размен"},
          {san:"bxc3",color:"w",note:"Пешки"},
        ],
        quiz: [
          {q:"Идея Bb4 в нимцовиче?", opts:["Развитие","⭐ Давление на c3, сдвоить пешки","Защита","Атака e4"], ans:1, exp:"Bb4 связывает коня c3, угрожая сдвоить пешки после Bxc3 bxc3."},
          {q:"e3 Рубинштейна — плюс?", opts:["Нет","⭐ Надёжно, не ослабляет d4","Острота","Атака"], ans:1, exp:"e3 — самый надёжный ответ, не создаёт слабостей в центре."},
          {q:"После Bxc3 bxc3 план чёрных?", opts:["Ждать","⭐ Подрывы c5 и e5","Атака f5","Размен"], ans:1, exp:"Чёрные атакуют слабые сдвоенные пешки ударами c5 и e5."},
        ]
      },
      {
        id: "classical_qc2", name: "Классическая 4.Qc2", eco: "E38",
        moves: [
          {san:"d4",color:"w",note:"Начало"},
          {san:"Nf6",color:"b",note:"Развитие"},
          {san:"c4",color:"w",note:"Атака"},
          {san:"e6",color:"b",note:"Структура"},
          {san:"Nc3",color:"w",note:"Развитие"},
          {san:"Bb4",color:"b",note:"Нимцович"},
          {san:"Qc2",color:"w",note:"⭐ Классика 4.Qc2"},
          {san:"O-O",color:"b",note:"Рокировка"},
          {san:"a3",color:"w",note:"Прогнать слона"},
          {san:"Bxc3",color:"b",note:"⭐ Берём на c3"},
          {san:"Qxc3",color:"w",note:"Ферзь берёт"},
          {san:"d5",color:"b",note:"Центр"},
          {san:"Nf3",color:"w",note:"Развитие"},
          {san:"dxc4",color:"b",note:"Берём пешку"},
          {san:"Qxc4",color:"w",note:"Ферзь активен"},
        ],
        quiz: [
          {q:"Зачем 4.Qc2?", opts:["Ошибка","⭐ Избежать сдвоенных пешек после Bxc3","Атака","Ферзь"], ans:1, exp:"Qc2 защищает коня c3: если Bxc3, то Qxc3 — нет сдвоенных пешек."},
          {q:"Ответ чёрных на Qc2?", opts:["Нет идеи","⭐ O-O, затем Bxc3 и d5","e5","c5"], ans:1, exp:"Чёрные рокируются, потом разменивают слона и захватывают центр через d5."},
          {q:"Кто popularизировал Нимцович?", opts:["Алёхин","⭐ Арон Нимцович, новатор теории","Капабланка","Ботвинник"], ans:1, exp:"Арон Нимцович изобрёл этот дебют как часть гиперсовременной концепции."},
        ]
      },
    ]
  },
  {
    id: "chigorin", name: "Защита Чигорина", emoji: "♞",
    playAs: "black", color: "#E74C3C",
    desc: "1...Nc6 — конь вместо пешки, идеи Михаила Чигорина.",
    idea: "Вместо стандартного d5 чёрные выводят коня c6, создавая нестандартную динамичную игру. Конь давит на d4 и готовит e5, но ограничивает продвижение c5. Михаил Чигорин, предтеча динамических шахмат, разработал этот дебют в конце XIX века.",
    variations: [
      {
        id: "main_bg4", name: "Основной (3.Nf3 Bg4)", eco: "D07",
        moves: [
          {san:"d4",color:"w",note:"Начало"},
          {san:"d5",color:"b",note:"Центр"},
          {san:"c4",color:"w",note:"Ферзевый гамбит"},
          {san:"Nc6",color:"b",note:"⭐ Чигорин!"},
          {san:"Nf3",color:"w",note:"Развитие"},
          {san:"Bg4",color:"b",note:"⭐ Связка коня"},
          {san:"e3",color:"w",note:"Укрепление"},
          {san:"e6",color:"b",note:"Структура"},
          {san:"Nc3",color:"w",note:"Развитие"},
          {san:"Nf6",color:"b",note:"Развитие"},
          {san:"Bd3",color:"w",note:"Слон"},
          {san:"dxc4",color:"b",note:"⭐ Берём пешку"},
          {san:"Bxc4",color:"w",note:"Слон берёт"},
        ],
        quiz: [
          {q:"Идея 2...Nc6 Чигорина?", opts:["Ошибка","⭐ Конь давит на d4, активная игра","Защита","Ожидание"], ans:1, exp:"Nc6 атакует пешку d4 нестандартным путём, создавая тактическую игру."},
          {q:"Bg4 — зачем?", opts:["Развитие","⭐ Связка Nf3, ограничение белых","Атака","Защита"], ans:1, exp:"Bg4 связывает коня f3, снижая давление на центр чёрных."},
          {q:"Минус защиты Чигорина?", opts:["Нет","⭐ Конь c6 блокирует пешку c7","Слон","Ладья"], ans:1, exp:"Конь на c6 мешает пешечному подрыву c5 и c7 — структурный недостаток."},
        ]
      },
      {
        id: "sharp_qxd5", name: "Острый (3.cxd5 Qxd5)", eco: "D07",
        moves: [
          {san:"d4",color:"w",note:"Начало"},
          {san:"d5",color:"b",note:"Центр"},
          {san:"c4",color:"w",note:"Гамбит"},
          {san:"Nc6",color:"b",note:"⭐ Чигорин"},
          {san:"cxd5",color:"w",note:"Размен"},
          {san:"Qxd5",color:"b",note:"⭐ Ферзь центр!"},
          {san:"e3",color:"w",note:"Развитие"},
          {san:"e5",color:"b",note:"Центр"},
          {san:"Nc3",color:"w",note:"Атака ферзя"},
          {san:"Bb4",color:"b",note:"⭐ Слон активен"},
          {san:"Bd2",color:"w",note:"Защита"},
          {san:"Bxc3",color:"b",note:"Размен"},
          {san:"bxc3",color:"w",note:"Пешки"},
        ],
        quiz: [
          {q:"3...Qxd5 — риск?", opts:["Нет","⭐ Ферзь выходит рано — могут атаковать","Ничего","Слабость"], ans:1, exp:"Ферзь на d5 может быть атакован темповыми ходами Nc3, потеря времени."},
          {q:"e5 после Qxd5 — зачем?", opts:["Ошибка","⭐ Захватить центр, укрепить позицию","Защита","Рокировка"], ans:1, exp:"e5 захватывает пространство и укрепляет позицию ферзя на d5."},
          {q:"Чигорин — кто?", opts:["Советский","⭐ Русский шахматист XIX века, новатор","Польский","Австрийский"], ans:1, exp:"Михаил Чигорин — выдающийся русский шахматист конца XIX века, создатель романтических систем."},
        ]
      },
    ]
  },
];

// ═══════════════ ХРАНЕНИЕ ПРОГРЕССА ═══════════════

const STORAGE_KEY = "chess_v1";
function loadProg() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function saveProg(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}
function getVP(prog, oid, vid) {
  return prog?.[oid]?.[vid] || { l: false, p: false, q: null };
}
function setVP(prog, oid, vid, upd) {
  const n = { ...prog, [oid]: { ...(prog[oid] || {}), [vid]: { ...getVP(prog, oid, vid), ...upd } } };
  saveProg(n);
  return n;
}

// ═══════════════ ЗВУКИ ═══════════════

const _ac = { c: null };
function getAC() {
  if (!_ac.c) try { _ac.c = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  return _ac.c;
}

function playSound(type) {
  const ctx = getAC();
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime;
    if (type === "move") {
      o.type = "triangle";
      o.frequency.setValueAtTime(880, t);
      o.frequency.exponentialRampToValueAtTime(440, t + 0.08);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      o.start(t); o.stop(t + 0.2);
    } else if (type === "capture") {
      o.type = "sawtooth";
      o.frequency.setValueAtTime(550, t);
      o.frequency.exponentialRampToValueAtTime(180, t + 0.15);
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.start(t); o.stop(t + 0.25);
    } else if (type === "wrong") {
      o.type = "sine";
      o.frequency.setValueAtTime(280, t);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.start(t); o.stop(t + 0.3);
    } else if (type === "correct") {
      o.type = "sine";
      o.frequency.setValueAtTime(660, t);
      o.frequency.setValueAtTime(880, t + 0.1);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.start(t); o.stop(t + 0.3);
    }
  } catch {}
}

// ═══════════════ ТЕМЫ ═══════════════

const THEMES = {
  dark: {
    bg: "#0f0e13",
    card: "#1a1825",
    card2: "#221f30",
    border: "#2e2a3e",
    text: "#e8e6f0",
    sub: "#a09ab8",
    accent: "#7c6fcd",
    accentHover: "#9b8fe0",
    btn: "#2e2a3e",
    btnHover: "#3d3857",
    correct: "#27ae60",
    wrong: "#e74c3c",
    tag: "#2e2a3e",
  },
  light: {
    bg: "#f0efe8",
    card: "#ffffff",
    card2: "#f5f4ee",
    border: "#ddd9cc",
    text: "#1a1825",
    sub: "#5a5570",
    accent: "#5a4fad",
    accentHover: "#7c6fcd",
    btn: "#e8e6df",
    btnHover: "#d8d5cc",
    correct: "#27ae60",
    wrong: "#e74c3c",
    tag: "#e8e6df",
  },
};

// ═══════════════ LearnMode ═══════════════

function LearnMode({ opening, variation, positions, onComplete, theme: T }) {
  const [step, setStep] = useState(0);
  const total = positions.length - 1;
  const pct = total > 0 ? Math.round((step / total) * 100) : 100;
  const pos = positions[step];
  const move = step > 0 ? variation.moves[step - 1] : null;
  const flipped = opening.playAs === "black";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Прогресс */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 6, background: T.border, borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: pct + "%", height: "100%", background: T.accent, borderRadius: 3, transition: "width .3s" }} />
        </div>
        <span style={{ color: T.sub, fontSize: 13 }}>{step}/{total}</span>
      </div>

      {/* Доска */}
      <div className="board-center">
        <Board
          board={pos.board}
          flipped={flipped}
          lastMoved={pos}
          highlights={{}}
          onSquare={null}
          dotHints={[]}
        />
      </div>

      {/* Текущий ход */}
      <div style={{ background: T.card2, borderRadius: 10, padding: "12px 16px", minHeight: 56 }}>
        {move ? (
          <>
            <span style={{ fontWeight: 700, color: T.accent, marginRight: 8, fontSize: 16 }}>
              {step}. {move.color === "w" ? "⬜" : "⬛"} {move.san}
            </span>
            <span style={{ color: T.text, fontSize: 15 }}>{move.note}</span>
          </>
        ) : (
          <span style={{ color: T.sub, fontSize: 14 }}>Начальная позиция</span>
        )}
      </div>

      {/* Кнопки навигации */}
      <div className="nav-btns">
        {[
          { label: "⏮", action: () => setStep(0), disabled: step === 0 },
          { label: "◀", action: () => setStep(s => Math.max(0, s - 1)), disabled: step === 0 },
          { label: "▶", action: () => setStep(s => Math.min(total, s + 1)), disabled: step === total },
          { label: "⏭", action: () => setStep(total), disabled: step === total },
        ].map(({ label, action, disabled }) => (
          <button key={label} onClick={action} disabled={disabled} style={{
            width: 48, height: 40, borderRadius: 8, border: "none",
            background: disabled ? T.border : T.btn,
            color: disabled ? T.sub : T.text,
            cursor: disabled ? "default" : "pointer", fontSize: 16,
            transition: "background .15s",
          }}>{label}</button>
        ))}
      </div>

      {/* Список ходов */}
      <div style={{ background: T.card2, borderRadius: 10, padding: "10px 12px", maxHeight: 160, overflowY: "auto" }}>
        <div className="move-list">
          {variation.moves.map((m, i) => (
            <button key={i} onClick={() => setStep(i + 1)} style={{
              padding: "3px 8px", borderRadius: 6, border: "none",
              background: step === i + 1 ? T.accent : T.btn,
              color: step === i + 1 ? "#fff" : T.sub,
              cursor: "pointer", fontSize: 13, fontWeight: step === i + 1 ? 700 : 400,
            }}>
              {m.color === "w" ? `${Math.ceil((i+1)/2)}.` : ""}{m.san}
            </button>
          ))}
        </div>
      </div>

      {/* Завершить */}
      {step === total && (
        <button onClick={onComplete} style={{
          padding: "12px 24px", borderRadius: 10, border: "none",
          background: T.correct, color: "#fff", fontSize: 16,
          fontWeight: 700, cursor: "pointer",
        }}>Завершить ✓</button>
      )}
    </div>
  );
}

// ═══════════════ PracticeMode ═══════════════

function PracticeMode({ opening, variation, positions, onComplete, theme: T }) {
  const flipped = opening.playAs === "black";
  const playerColor = opening.playAs === "black" ? "b" : "w";
  const total = positions.length - 1;

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState("");
  const [hintSq, setHintSq] = useState(null);
  const [done, setDone] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);

  const pos = positions[step];

  // Чей ход сейчас
  const currentColor = step < total ? variation.moves[step].color : null;
  const isPlayerTurn = currentColor === playerColor;

  // Автоход соперника
  useEffect(() => {
    if (done || isPlayerTurn || step >= total) return;
    setAutoRunning(true);
    const id = setTimeout(() => {
      setStep(s => s + 1);
      playSound("move");
      setAutoRunning(false);
    }, 900);
    return () => clearTimeout(id);
  }, [step, isPlayerTurn, done, total]);

  function reset() {
    setStep(0); setSelected(null); setMsg(""); setHintSq(null); setDone(false);
  }

  function handleSquare(r, c) {
    if (!isPlayerTurn || done || autoRunning) return;
    const piece = pos.board[r][c];

    if (selected) {
      // Пробуем ход
      const next = positions[step + 1];
      const mf = next?.mf, mt = next?.mt;
      if (mf && mt &&
          selected[0] === mf[0] && selected[1] === mf[1] &&
          r === mt[0] && c === mt[1]) {
        // Верно
        const wasCapture = positions[step].board[r][c] !== "";
        playSound(wasCapture ? "capture" : "move");
        setSelected(null); setHintSq(null); setMsg("");
        const nextStep = step + 1;
        setStep(nextStep);
        if (nextStep >= total) { setDone(true); }
      } else if (piece && piece[0] === playerColor) {
        // Выбрали другую свою фигуру
        setSelected([r, c]); setMsg("");
      } else {
        playSound("wrong");
        setMsg("Неверно! Попробуй ещё раз.");
        setSelected(null);
      }
    } else {
      if (piece && piece[0] === playerColor) {
        setSelected([r, c]); setMsg("");
      }
    }
  }

  function hint() {
    if (!isPlayerTurn || done) return;
    const next = positions[step + 1];
    if (next?.mf) setHintSq(next.mf);
  }

  // Подсветка
  const highlights = {};
  if (selected) highlights[`${selected[0]},${selected[1]}`] = "selected";
  if (hintSq) highlights[`${hintSq[0]},${hintSq[1]}`] = "hint";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Прогресс */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 6, background: T.border, borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: (step / total * 100) + "%", height: "100%", background: T.accent, borderRadius: 3, transition: "width .3s" }} />
        </div>
        <span style={{ color: T.sub, fontSize: 13 }}>{step}/{total}</span>
      </div>

      {/* Статус */}
      <div style={{
        background: T.card2, borderRadius: 8, padding: "8px 14px",
        color: msg ? T.wrong : T.sub, fontSize: 14, minHeight: 36,
        display: "flex", alignItems: "center",
      }}>
        {done
          ? <span style={{ color: T.correct, fontWeight: 700 }}>🎉 Отлично! Вариант пройден!</span>
          : msg || (isPlayerTurn ? "Ваш ход" : "Соперник думает…")}
      </div>

      {/* Доска */}
      <div className="board-center">
        <Board
          board={pos.board}
          flipped={flipped}
          highlights={highlights}
          onSquare={handleSquare}
          lastMoved={pos}
          dotHints={[]}
        />
      </div>

      {/* Кнопки */}
      <div className="practice-btns">
        <button onClick={hint} disabled={done || !isPlayerTurn} style={{
          flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
          background: T.btn, color: T.text, cursor: "pointer", fontSize: 14,
        }}>💡 Подсказка</button>
        <button onClick={reset} style={{
          flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
          background: T.btn, color: T.text, cursor: "pointer", fontSize: 14,
        }}>🔄 Сначала</button>
      </div>

      {/* Финал */}
      {done && (
        <div className="practice-final-btns">
          <button onClick={reset} style={{
            flex: 1, padding: "12px 0", borderRadius: 10, border: "none",
            background: T.btn, color: T.text, fontSize: 15, cursor: "pointer",
          }}>Повтор</button>
          <button onClick={onComplete} style={{
            flex: 1, padding: "12px 0", borderRadius: 10, border: "none",
            background: T.correct, color: "#fff", fontSize: 15,
            fontWeight: 700, cursor: "pointer",
          }}>Далее →</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════ QuizMode ═══════════════

function QuizMode({ variation, opening, onComplete, theme: T }) {
  const questions = variation.quiz;
  const [qi, setQi] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  function reset() {
    setQi(0); setChosen(null); setScore(0); setFinished(false);
  }

  function pick(idx) {
    if (chosen !== null) return;
    const correct = questions[qi].ans === idx;
    if (correct) { playSound("correct"); setScore(s => s + 1); }
    else playSound("wrong");
    setChosen(idx);
  }

  function next() {
    if (qi + 1 >= questions.length) { setFinished(true); }
    else { setQi(q => q + 1); setChosen(null); }
  }

  if (finished) {
    const s = score, total = questions.length;
    const emoji = s === total ? "🏆" : s >= 2 ? "🎓" : "📚";
    return (
      <div className="quiz-finals">
        <div style={{ fontSize: 64 }}>{emoji}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: T.text }}>{s}/{total}</div>
        <div style={{ color: T.sub, fontSize: 16 }}>
          {s === total ? "Идеально!" : s >= 2 ? "Хорошо, повтори ещё раз" : "Нужно повторить теорию"}
        </div>
        <div className="quiz-final-btns">
          <button onClick={reset} style={{
            padding: "11px 24px", borderRadius: 10, border: "none",
            background: T.btn, color: T.text, fontSize: 15, cursor: "pointer",
          }}>Снова</button>
          <button onClick={onComplete} style={{
            padding: "11px 24px", borderRadius: 10, border: "none",
            background: T.accent, color: "#fff", fontSize: 15,
            fontWeight: 700, cursor: "pointer",
          }}>Завершить ✓</button>
        </div>
      </div>
    );
  }

  const q = questions[qi];
  const LETTERS = ["A","B","C","D"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Прогресс */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 6, background: T.border, borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: ((qi / questions.length) * 100) + "%", height: "100%", background: T.accent, borderRadius: 3, transition: "width .3s" }} />
        </div>
        <span style={{ color: T.sub, fontSize: 13 }}>{qi + 1}/{questions.length}</span>
      </div>

      {/* Вопрос */}
      <div style={{
        background: T.card2, borderRadius: 12, padding: "18px 16px",
        fontSize: 17, fontWeight: 600, color: T.text, lineHeight: 1.5,
      }}>{q.q}</div>

      {/* Варианты */}
      <div className="quiz-opts">
        {q.opts.map((opt, i) => {
          const isCorrect = i === q.ans;
          const isPicked  = i === chosen;
          let bg = T.btn;
          if (chosen !== null && isCorrect) bg = T.correct;
          else if (isPicked && !isCorrect) bg = T.wrong;
          return (
            <button key={i} onClick={() => pick(i)} style={{
              padding: "12px 16px", borderRadius: 10, border: "none",
              background: bg, color: chosen !== null && (isCorrect || isPicked) ? "#fff" : T.text,
              cursor: chosen !== null ? "default" : "pointer",
              textAlign: "left", fontSize: 15, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 12,
              transition: "background .2s",
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}>{LETTERS[i]}</span>
              {opt}
            </button>
          );
        })}
      </div>

      {/* Объяснение */}
      {chosen !== null && (
        <div style={{
          background: chosen === q.ans ? "rgba(39,174,96,0.12)" : "rgba(231,76,60,0.12)",
          border: `1px solid ${chosen === q.ans ? T.correct : T.wrong}`,
          borderRadius: 10, padding: "12px 16px", color: T.text, fontSize: 14,
        }}>
          {q.exp}
        </div>
      )}

      {chosen !== null && (
        <button onClick={next} style={{
          padding: "12px 0", borderRadius: 10, border: "none",
          background: T.accent, color: "#fff", fontSize: 15,
          fontWeight: 700, cursor: "pointer",
        }}>{qi + 1 >= questions.length ? "Результат" : "Следующий →"}</button>
      )}
    </div>
  );
}

// ═══════════════ OpeningDetail ═══════════════

function OpeningDetail({ opening, progress, onProgress, onBack, theme: T }) {
  const [selVar, setSelVar] = useState(opening.variations[0].id);
  const [tab, setTab] = useState("learn");

  const variation = opening.variations.find(v => v.id === selVar);
  const positions = useMemo(() => buildPositions(variation.moves), [variation]);

  const vp = getVP(progress, opening.id, variation.id);

  function handleComplete(type) {
    const upd = type === "learn" ? { l: true } : type === "practice" ? { p: true } : { q: true };
    onProgress(setVP(progress, opening.id, variation.id, upd));
  }

  const TABS = [
    { id: "learn",    label: "📚 Изучение" },
    { id: "practice", label: "♟ Практика" },
    { id: "quiz",     label: "📝 Тест" },
  ];

  return (
    <div className="detail-wrap">
      {/* Шапка — полная ширина */}
      <div className="detail-header">
        <button onClick={onBack} style={{
          background: T.btn, border: "none", borderRadius: 8,
          padding: "8px 12px", color: T.text, cursor: "pointer", fontSize: 15, flexShrink: 0,
        }}>← Назад</button>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>
            {opening.emoji} {opening.name}
          </div>
          <div style={{ color: T.sub, fontSize: 13, marginTop: 2 }}>{opening.desc}</div>
          <div style={{
            display: "inline-block", marginTop: 6, padding: "2px 10px", borderRadius: 12,
            background: opening.color + "22", color: opening.color, fontSize: 12, fontWeight: 600,
          }}>
            За {opening.playAs === "white" ? "белых ⬜" : "чёрных ⬛"}
          </div>
        </div>
      </div>

      {/* Двухколоночный макет на десктопе */}
      <div className="detail-body">

        {/* ── Левая колонка: идея + варианты ── */}
        <div className="detail-sidebar">
          {opening.idea && (
            <div style={{
              background: T.card2, borderRadius: 10, padding: "12px 14px",
              marginBottom: 14, borderLeft: `3px solid ${opening.color}`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: opening.color, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Главная идея</div>
              <div style={{ color: T.text, fontSize: 13, lineHeight: 1.6 }}>{opening.idea}</div>
            </div>
          )}

          <div className="var-list">
            {opening.variations.map(v => {
              const vvp = getVP(progress, opening.id, v.id);
              const stars = [vvp.l, vvp.p, vvp.q].filter(Boolean).length;
              return (
                <button key={v.id} onClick={() => { setSelVar(v.id); setTab("learn"); }} style={{
                  background: selVar === v.id ? T.accent + "22" : T.card2,
                  border: `1.5px solid ${selVar === v.id ? T.accent : T.border}`,
                  borderRadius: 10, padding: "10px 14px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  cursor: "pointer", color: T.text, width: "100%",
                }}>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{v.name}</div>
                    <div style={{ color: T.sub, fontSize: 12 }}>{v.eco}</div>
                  </div>
                  <div style={{ fontSize: 16 }}>{"⭐".repeat(stars)}{"☆".repeat(3 - stars)}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Правая колонка: табы + контент ── */}
        <div className="detail-main">
          <div className="detail-tabs">
            {TABS.map(tb => (
              <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                flex: 1, padding: "9px 4px", borderRadius: 8, border: "none",
                background: tab === tb.id ? T.accent : T.btn,
                color: tab === tb.id ? "#fff" : T.sub,
                cursor: "pointer", fontSize: 13, fontWeight: tab === tb.id ? 700 : 400,
              }}>{tb.label}</button>
            ))}
          </div>

          <div key={selVar + tab}>
            {tab === "learn" && (
              <LearnMode
                opening={opening} variation={variation} positions={positions}
                onComplete={() => handleComplete("learn")} theme={T}
              />
            )}
            {tab === "practice" && (
              <PracticeMode
                opening={opening} variation={variation} positions={positions}
                onComplete={() => handleComplete("practice")} theme={T}
              />
            )}
            {tab === "quiz" && (
              <QuizMode
                variation={variation} opening={opening}
                onComplete={() => handleComplete("quiz")} theme={T}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ═══════════════ Home ═══════════════

function Home({ progress, onSelect, theme: T }) {
  const totalVars  = OPENINGS.reduce((s, o) => s + o.variations.length, 0);
  const doneVars   = OPENINGS.reduce((s, o) =>
    s + o.variations.filter(v => {
      const vp = getVP(progress, o.id, v.id);
      return vp.l && vp.p && vp.q;
    }).length, 0);
  const pct = totalVars > 0 ? Math.round((doneVars / totalVars) * 100) : 0;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 14px 32px" }}>
      {/* Заголовок */}
      <div style={{ padding: "24px 0 18px", textAlign: "center" }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: T.text }}>♟ Шахматные дебюты</div>
        <div style={{ color: T.sub, fontSize: 14, marginTop: 6 }}>
          {doneVars} из {totalVars} вариантов пройдено
        </div>
        <div style={{ margin: "10px auto 0", maxWidth: 300, height: 6, background: T.border, borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: pct + "%", height: "100%", background: T.accent, borderRadius: 3, transition: "width .4s" }} />
        </div>
      </div>

      {/* Сетка карточек — CSS-класс управляет колонками */}
      <div className="opening-grid">
        {OPENINGS.map(o => {
          const varDone = o.variations.filter(v => {
            const vp = getVP(progress, o.id, v.id);
            return vp.l && vp.p && vp.q;
          }).length;
          const varPct = Math.round((varDone / o.variations.length) * 100);
          return (
            <button key={o.id} onClick={() => onSelect(o)} className="opening-card">
              <div style={{ fontSize: 36 }}>{o.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: T.text, lineHeight: 1.3 }}>{o.name}</div>
              <div style={{
                padding: "2px 7px", borderRadius: 8,
                background: o.color + "22", color: o.color, fontSize: 11, fontWeight: 600,
              }}>
                {o.playAs === "white" ? "♔ Белые" : "♚ Чёрные"}
              </div>
              <div className="opening-card__progress">
                <div className="opening-card__bar-track">
                  <div style={{ width: varPct + "%", height: "100%", background: o.color, borderRadius: 2, transition: "width .4s" }} />
                </div>
                <div style={{ color: T.sub, fontSize: 11, marginTop: 3 }}>
                  {varDone}/{o.variations.length} вар.
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════ CSS ═══════════════

const APP_CSS = `
  /* ── Утилиты ── */
  *, *::before, *::after { box-sizing: border-box; }
  .app-root { min-height: 100vh; font-family: 'Inter', system-ui, sans-serif; }

  /* ── Home: сетка дебютов ── */
  .opening-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .opening-card {
    border-radius: 14px;
    padding: 12px 10px;
    cursor: pointer;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    min-height: 150px;
    width: 100%;
    box-shadow: 0 1px 4px rgba(0,0,0,.10);
    transition: border-color .15s, box-shadow .15s;
    background: var(--card);
    border: 1px solid var(--border);
  }
  .opening-card:hover {
    border-color: var(--accent);
    box-shadow: 0 3px 10px rgba(0,0,0,.18);
  }
  .opening-card__progress {
    width: 100%;
    margin-top: auto;
  }
  .opening-card__bar-track {
    height: 3px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
  }

  /* ── OpeningDetail ── */
  .detail-wrap {
    max-width: 540px;
    margin: 0 auto;
    padding: 0 14px 32px;
  }
  .detail-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px 0 12px;
  }
  .detail-body {
    display: flex;
    flex-direction: column;
  }
  .detail-sidebar {
    display: flex;
    flex-direction: column;
  }
  .detail-main {
    display: flex;
    flex-direction: column;
  }
  .var-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }
  .detail-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
  }

  /* ── LearnMode ── */
  .nav-btns {
    display: flex;
    gap: 8px;
    justify-content: center;
  }
  .move-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  /* ── QuizMode ── */
  .quiz-opts {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .quiz-finals {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
    padding: 20px 0;
  }
  .quiz-final-btns {
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }

  /* ── PracticeMode ── */
  .practice-btns {
    display: flex;
    gap: 8px;
  }
  .practice-final-btns {
    display: flex;
    gap: 8px;
  }

  /* ── Board wrapper ── */
  .board-center {
    display: flex;
    justify-content: center;
  }

  /* ════════════════════════════════
     ТЕЛЕФОН  ≤ 768px  — вертикально
     ════════════════════════════════ */
  @media (max-width: 768px) {
    .opening-grid { grid-template-columns: 1fr; }
    .detail-body  { flex-direction: column; gap: 0; }
  }

  /* ════════════════════════════════
     ДЕСКТОП  ≥ 769px  — 2 колонки
     ════════════════════════════════ */
  @media (min-width: 769px) {
    .opening-grid {
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .opening-card { min-height: 170px; }

    .detail-wrap { max-width: 980px; }
    .detail-body {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 28px;
      align-items: start;
    }
    .detail-sidebar { position: sticky; top: 16px; }
  }
`;

// ═══════════════ App ═══════════════

export default function App() {
  const [themeKey, setThemeKey]       = useState("dark");
  const [selected, setSelected]       = useState(null);
  const [progress, setProgress]       = useState(loadProg);

  const T = THEMES[themeKey];

  const cssVars = {
    "--bg": T.bg, "--card": T.card, "--card2": T.card2,
    "--border": T.border, "--text": T.text, "--sub": T.sub,
    "--accent": T.accent, "--btn": T.btn,
    background: T.bg,
  };

  return (
    <>
      <style>{APP_CSS}</style>
      <div className="app-root" style={cssVars}>
      {/* Кнопка темы */}
      <div style={{ position: "fixed", top: 12, right: 14, zIndex: 100 }}>
        <button onClick={() => setThemeKey(k => k === "dark" ? "light" : "dark")} style={{
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 8,
          padding: "7px 11px", cursor: "pointer", fontSize: 18, color: T.text,
        }}>
          {themeKey === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      {selected ? (
        <OpeningDetail
          opening={selected}
          progress={progress}
          onProgress={setProgress}
          onBack={() => setSelected(null)}
          theme={T}
        />
      ) : (
        <Home progress={progress} onSelect={setSelected} theme={T} />
      )}
      </div>
    </>
  );
}
