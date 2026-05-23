import { useState, useMemo, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════
//  CHESS ENGINE
// ═══════════════════════════════════════════
const FILES = "abcdefgh", RANKS = "87654321";
const f2c = f => FILES.indexOf(f);
const r2r = r => RANKS.indexOf(r);
const c2f = c => FILES[c];
const r2n = r => RANKS[r];

const SYM = {
  wp:"♙",wn:"♘",wb:"♗",wr:"♖",wq:"♕",wk:"♔",
  bp:"♟",bn:"♞",bb:"♝",br:"♜",bq:"♛",bk:"♚"
};

const initBoard = () => [
  ["br","bn","bb","bq","bk","bb","bn","br"],
  ["bp","bp","bp","bp","bp","bp","bp","bp"],
  ["","","","","","","",""],["","","","","","","",""],
  ["","","","","","","",""],["","","","","","","",""],
  ["wp","wp","wp","wp","wp","wp","wp","wp"],
  ["wr","wn","wb","wq","wk","wb","wn","wr"],
];

function pathOk(b, fr, fc, tr, tc) {
  const dr = Math.sign(tr-fr), dc = Math.sign(tc-fc);
  let r = fr+dr, c = fc+dc;
  while (r!==tr || c!==tc) { if (b[r][c]) return false; r+=dr; c+=dc; }
  return true;
}

function canMove(b, fr, fc, tr, tc, col, p) {
  const dr = tr-fr, dc = tc-fc, t = b[tr][tc];
  if (t && t[0]===col) return false;
  if (p==="p") {
    const d = col==="w"?-1:1, s = col==="w"?6:1;
    if (!dc && dr===d && !t) return true;
    if (!dc && dr===2*d && fr===s && !t && !b[fr+d][fc]) return true;
    if (Math.abs(dc)===1 && dr===d && t && t[0]!==col) return true;
    return false;
  }
  if (p==="n") return (Math.abs(dc)===2&&Math.abs(dr)===1)||(Math.abs(dc)===1&&Math.abs(dr)===2);
  if (p==="b") return Math.abs(dc)===Math.abs(dr) && dc!==0 && pathOk(b,fr,fc,tr,tc);
  if (p==="r") return (dc===0||dr===0) && (dc!==0||dr!==0) && pathOk(b,fr,fc,tr,tc);
  if (p==="q") return ((dc===0||dr===0)||Math.abs(dc)===Math.abs(dr)) && (dc!==0||dr!==0) && pathOk(b,fr,fc,tr,tc);
  if (p==="k") return Math.abs(dc)<=1 && Math.abs(dr)<=1 && (dc!==0||dr!==0);
  return false;
}

function applyMove(board, san, col) {
  const b = board.map(r=>[...r]);
  let m = san.replace(/[+#!?]/g,"");
  if (m==="O-O") {
    const row=col==="w"?7:0; b[row][4]=""; b[row][7]=""; b[row][6]=col+"k"; b[row][5]=col+"r"; return b;
  }
  if (m==="O-O-O") {
    const row=col==="w"?7:0; b[row][4]=""; b[row][0]=""; b[row][2]=col+"k"; b[row][3]=col+"r"; return b;
  }
  let piece = "p";
  if ("RNBQK".includes(m[0])) { piece = m[0].toLowerCase(); m = m.slice(1); }
  let fromFile=null, fromRank=null, toSq;
  if (m.includes("x")) {
    const [a, b2] = m.split("x"); toSq = b2.slice(0,2);
    if (a.length===1) { FILES.includes(a) ? (fromFile=a) : (fromRank=a); }
    else if (a.length===2) { fromFile=a[0]; fromRank=a[1]; }
  } else {
    toSq = m.slice(-2); const d = m.slice(0,-2);
    if (d.length===1) { FILES.includes(d) ? (fromFile=d) : (fromRank=d); }
    else if (d.length===2) { fromFile=d[0]; fromRank=d[1]; }
  }
  const tc = f2c(toSq[0]), tr = r2r(toSq[1]);
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    const p = b[r][c];
    if (!p||p[0]!==col||p[1]!==piece) continue;
    if (fromFile && c2f(c)!==fromFile) continue;
    if (fromRank && r2n(r)!==fromRank) continue;
    if (canMove(b,r,c,tr,tc,col,piece)) { b[tr][tc]=p; b[r][c]=""; return b; }
  }
  console.warn("Move failed:", san, col);
  return b;
}

function buildPositions(moves) {
  const positions = [{ board: initBoard(), changed: [], mf: null, mt: null }];
  let board = initBoard();
  for (const m of moves) {
    const nb = applyMove(board, m.san, m.color);
    const changed = []; let mf=null, mt=null;
    for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
      if (board[r][c] !== nb[r][c]) changed.push(`${r},${c}`);
      if (board[r][c] && !nb[r][c] && !mf) mf=[r,c];
      if (nb[r][c] && (!board[r][c] || board[r][c][0]!==nb[r][c][0]) && !mt) mt=[r,c];
    }
    board = nb;
    positions.push({ board: board.map(r=>[...r]), changed, mf, mt });
  }
  return positions;
}

// ═══════════════════════════════════════════
//  OPENING DATA
// ═══════════════════════════════════════════
const OPENINGS = [
  {
    id:"catalan", name:"Каталонское начало", emoji:"🏔️",
    playAs:"white", flip:false, color:"#4A90D9", gradient:"linear-gradient(135deg,#1a3a6b,#4A90D9)",
    tagline:"Позиционный дебют с мощным фианкетто-слоном",
    desc:"Каталонское начало сочетает идеи ферзевого гамбита с фианкетто слона на g2. «Каталонский слон» давит на ферзевый фланг чёрных по длинной диагонали a8-h1 и создаёт долгосрочное позиционное давление.",
    moves:[
      {san:"d4",color:"w",text:"1.d4",note:"Занимаем центр — начало закрытых дебютов"},
      {san:"d5",color:"b",text:"1...d5",note:"Чёрные симметрично отвечают на центр"},
      {san:"c4",color:"w",text:"2.c4",note:"Атака ферзевого гамбита — нападаем на пешку d5"},
      {san:"e6",color:"b",text:"2...e6",note:"Чёрные поддерживают пешку d5"},
      {san:"Nf3",color:"w",text:"3.Nf3",note:"Развиваем коня, контролируем центральные поля"},
      {san:"Nf6",color:"b",text:"3...Nf6",note:"Чёрные развивают коня, нападают на e4"},
      {san:"g3",color:"w",text:"4.g3",note:"⭐ Ключевой ход! Готовим фианкетто слона на g2"},
      {san:"Be7",color:"b",text:"4...Be7",note:"Чёрные развивают слона, готовятся к рокировке"},
      {san:"Bg2",color:"w",text:"5.Bg2",note:"⭐ Каталонский слон! Главная фигура дебюта"},
      {san:"O-O",color:"b",text:"5...O-O",note:"Чёрные рокируются в безопасное место"},
      {san:"O-O",color:"w",text:"6.O-O",note:"Белые рокируются, активируем ладью f1"},
      {san:"dxc4",color:"b",text:"6...dxc4",note:"Открытый каталон — чёрные берут гамбитную пешку"},
      {san:"Qc2",color:"w",text:"7.Qc2",note:"Атакуем пешку c4 и готовим её возврат с активной игрой"},
    ],
    quiz:[
      {q:"Какой ход ГЛАВНЫЙ в Каталонском начале?",opts:["e4 с атакой","Nc3 + d4","g3 и Bg2 (фианкетто)","c3 + d4"],ans:2,exp:"g3 и Bg2 — отличительная черта! «Каталонский слон» на g2 — главная фигура дебюта, давящая по длинной диагонали."},
      {q:"Как называется слон на g2?",opts:["Лондонский","Каталонский","Фианкетто","Атакующий"],ans:1,exp:"Слон на g2 называется «каталонским» — мощная фигура, контролирующая диагональ a8-h1 и давящая на ферзевый фланг чёрных."},
      {q:"Что такое Открытый каталон?",opts:["Белые играют g3","Чёрные берут пешку c4 (dxc4)","Белые жертвуют пешку e4","Размен слонов"],ans:1,exp:"Открытый каталон возникает после 6...dxc4. Чёрные берут гамбитную пешку, что ведёт к острой и динамичной игре."},
      {q:"Зачем белые играют 7.Qc2?",opts:["Защищают короля","Атакуют пешку c4","Готовят e4","Это ошибка"],ans:1,exp:"Ферзь на c2 атакует пешку c4, стремясь её вернуть. Это активная позиция ферзя с давлением на ферзевый фланг."},
      {q:"На каком фланге главным образом давит «каталонский слон»?",opts:["Королевском","Ферзевом","Нигде","Везде одинаково"],ans:1,exp:"Каталонский слон давит по диагонали a8-h1, создавая давление на ферзевом фланге чёрных — именно там и разгорается главная борьба."},
    ]
  },
  {
    id:"chigorin", name:"Защита Чигорина", emoji:"♞",
    playAs:"black", flip:true, color:"#E05C6A", gradient:"linear-gradient(135deg,#5a1a1a,#E05C6A)",
    tagline:"Острая контригра русского гения",
    desc:"Защита Чигорина — оригинальная система против ферзевого гамбита. Вместо пассивного e6 чёрные играют Nc6, немедленно создавая контригру. Разработана великим Михаилом Чигориным.",
    moves:[
      {san:"d4",color:"w",text:"1.d4",note:"Белые начинают ферзевым пешечным дебютом"},
      {san:"d5",color:"b",text:"1...d5",note:"Чёрные занимают центр"},
      {san:"c4",color:"w",text:"2.c4",note:"Ферзевый гамбит"},
      {san:"Nc6",color:"b",text:"2...Nc6",note:"⭐ Ход Чигорина! Конь защищает d5, создаём острую игру"},
      {san:"Nf3",color:"w",text:"3.Nf3",note:"Белые развивают коня"},
      {san:"Bg4",color:"b",text:"3...Bg4",note:"⭐ Связываем коня f3 — активная контригра!"},
      {san:"e3",color:"w",text:"4.e3",note:"Белые укрепляют центр пешкой"},
      {san:"e6",color:"b",text:"4...e6",note:"Укрепляем пешечную структуру"},
      {san:"Nc3",color:"w",text:"5.Nc3",note:"Защита пешки d4"},
      {san:"Nf6",color:"b",text:"5...Nf6",note:"Развиваем коня, создаём давление на e4"},
      {san:"Bd3",color:"w",text:"6.Bd3",note:"Белые развивают слона"},
      {san:"dxc4",color:"b",text:"6...dxc4",note:"Берём пешку! Вскрываем позицию для активных фигур"},
      {san:"Bxc4",color:"w",text:"7.Bxc4",note:"Белые возвращают слона на активную позицию"},
    ],
    quiz:[
      {q:"Какой ход определяет Защиту Чигорина?",opts:["1...e6","1...Nf6","2...Nc6","2...e5"],ans:2,exp:"2...Nc6 — ход Чигорина! Конь развивается, защищает d5 и немедленно создаёт давление на центр."},
      {q:"Кто разработал эту защиту?",opts:["Александр Алехин","Михаил Ботвинник","Михаил Чигорин","Борис Спасский"],ans:2,exp:"Михаил Иванович Чигорин (1850-1908) — великий русский шахматный мастер, создатель этой оригинальной системы."},
      {q:"Зачем чёрные играют 3...Bg4?",opts:["Защита пешки d5","Связка коня f3","Подготовка рокировки","Атака на e4"],ans:1,exp:"Слон на g4 «связывает» коня f3, ограничивая его подвижность. Если конь уйдёт — пешка d4 останется без защиты."},
      {q:"Что даёт чёрным ход 6...dxc4?",opts:["Потерю пешки","Вскрытие позиции для активной игры","Ослабление короля","Ничего особенного"],ans:1,exp:"6...dxc4 вскрывает позицию, где активные фигуры чёрных (связанный конь c6, слон g4) получают больше простора."},
      {q:"Против чего применяется Защита Чигорина?",opts:["1.e4","1.Nf3","Ферзевого гамбита (1.d4+2.c4)","Английского начала"],ans:2,exp:"Защита Чигорина — специфический ответ на ферзевый гамбит: 1.d4 d5 2.c4 Nc6. Именно 2.c4 провоцирует ход Чигорина."},
    ]
  },
  {
    id:"english", name:"Английское начало", emoji:"🎩",
    playAs:"white", flip:false, color:"#2ECC8A", gradient:"linear-gradient(135deg,#0d3d26,#2ECC8A)",
    tagline:"Гибкий позиционный дебют с 1.c4",
    desc:"Английское начало — 1.c4. Белые контролируют центральное поле d5, не занимая его сразу пешкой. Дебют отличается исключительной гибкостью и любим позиционными игроками.",
    moves:[
      {san:"c4",color:"w",text:"1.c4",note:"⭐ Английское начало! Контролируем поле d5 без занятия центра"},
      {san:"e5",color:"b",text:"1...e5",note:"Чёрные занимают центр — симметричный вариант"},
      {san:"Nc3",color:"w",text:"2.Nc3",note:"Развиваем коня с давлением на пешку e5"},
      {san:"Nf6",color:"b",text:"2...Nf6",note:"Развитие коня"},
      {san:"g3",color:"w",text:"3.g3",note:"Готовим фианкетто — позиционная стратегия"},
      {san:"d5",color:"b",text:"3...d5",note:"Чёрные активно борются за центр"},
      {san:"cxd5",color:"w",text:"4.cxd5",note:"Меняем пешку, открываем диагональ для слона"},
      {san:"Nxd5",color:"b",text:"4...Nxd5",note:"Конь занимает сильное центральное поле d5"},
      {san:"Bg2",color:"w",text:"5.Bg2",note:"⭐ Фианкетто слона — ключевая идея дебюта!"},
      {san:"Nb6",color:"b",text:"5...Nb6",note:"Конь отступает на активную позицию"},
      {san:"Nf3",color:"w",text:"6.Nf3",note:"Развиваем коня, атакуем пешку e5"},
      {san:"Nc6",color:"b",text:"6...Nc6",note:"Чёрные развивают ферзевого коня"},
      {san:"O-O",color:"w",text:"7.O-O",note:"Рокируемся, активируем ладью f1"},
    ],
    quiz:[
      {q:"С какого хода начинается Английское начало?",opts:["1.d4","1.e4","1.c4","1.Nf3"],ans:2,exp:"1.c4 — начало Английского дебюта. Пешка c берёт под контроль центральное поле d5."},
      {q:"В честь кого назван дебют?",opts:["Говарда Стаунтона (Англия)","Каспарова","Алехина","Карпова"],ans:0,exp:"Дебют назван в честь Говарда Стаунтона — английского чемпиона XIX века, popularизировавшего ход 1.c4."},
      {q:"Зачем белые играют 3.g3?",opts:["Атака пешки e5","Защита от шаха","Подготовка фианкетто Bg2","Ошибка"],ans:2,exp:"3.g3 готовит фианкетто: после Bg2 слон будет давить по длинной диагонали — это главная позиционная идея."},
      {q:"Какое поле контролирует пешка c4?",opts:["e4","b5","d5","f4"],ans:2,exp:"Пешка c4 контролирует центральное поле d5 — ключевая идея. Белые борются за центр без его прямого занятия."},
      {q:"Стиль игры в Английском начале?",opts:["Агрессивная атака","Гамбитная жертва","Позиционная, стратегическая","Только ничья"],ans:2,exp:"Английское начало — позиционный дебют. Белые строят долгосрочное давление, избегая ранних тактических осложнений."},
    ]
  },
  {
    id:"sicilian", name:"Сицилианская защита", emoji:"🛡️",
    playAs:"black", flip:true, color:"#A855F7", gradient:"linear-gradient(135deg,#2d1245,#A855F7)",
    tagline:"Самый популярный ответ на 1.e4 в мире",
    desc:"Сицилианская защита — 1...c5. Самый распространённый ответ на 1.e4! Чёрные создают асимметрию в центре, борясь за инициативу. Вариант Найдорфа (5...a6) — любимое оружие Фишера и Каспарова.",
    moves:[
      {san:"e4",color:"w",text:"1.e4",note:"Белые занимают центр — самое популярное начало"},
      {san:"c5",color:"b",text:"1...c5",note:"⭐ Сицилианская защита! Асимметричная борьба за центр"},
      {san:"Nf3",color:"w",text:"2.Nf3",note:"Развитие коня, подготовка хода d4"},
      {san:"d6",color:"b",text:"2...d6",note:"Готовим Nf6, контролируем поле e5"},
      {san:"d4",color:"w",text:"3.d4",note:"Белые открывают центр — стандартный план"},
      {san:"cxd4",color:"b",text:"3...cxd4",note:"Берём пешку! Получаем полуоткрытую линию c"},
      {san:"Nxd4",color:"w",text:"4.Nxd4",note:"Конь занимает сильное центральное поле d4"},
      {san:"Nf6",color:"b",text:"4...Nf6",note:"Развиваем коня с нападением на пешку e4"},
      {san:"Nc3",color:"w",text:"5.Nc3",note:"Защита пешки e4, развитие фигуры"},
      {san:"a6",color:"b",text:"5...a6",note:"⭐ Вариант Найдорфа! Готовим b5, блокируем Nb5"},
      {san:"Be3",color:"w",text:"6.Be3",note:"Развиваем слона, поддерживаем d4"},
      {san:"e5",color:"b",text:"6...e5",note:"Атакуем коня d4, захватываем пространство"},
      {san:"Nb3",color:"w",text:"7.Nb3",note:"Конь отступает, сохраняя напряжение в центре"},
    ],
    quiz:[
      {q:"Какой ход определяет Сицилианскую защиту?",opts:["1...e5","1...e6","1...c5","1...d5"],ans:2,exp:"1...c5 — Сицилианская! Чёрные атакуют поле d4, создавая асимметричный центр с богатой контригрой."},
      {q:"Как называется вариант с 5...a6?",opts:["Вариант Дракона","Вариант Найдорфа","Схевенинген","Паульсен"],ans:1,exp:"5...a6 — вариант Найдорфа (по Мигелю Найдорфу). Любимое оружие Бобби Фишера и Гарри Каспарова."},
      {q:"Что даёт чёрным размен 3...cxd4?",opts:["Ничего","Полуоткрытую линию c для ладьи","Сдвоенные пешки","Ослабление"],ans:1,exp:"После 3...cxd4 у чёрных появляется полуоткрытая линия c, которую они используют для активной контригры ладьёй."},
      {q:"Зачем 5...a6 в варианте Найдорфа?",opts:["Атака короля","Предотвратить Nb5 белых и готовить b5","Защита d6","Выход ладьи"],ans:1,exp:"a6 предотвращает прыжок коня Nb5 и готовит b5 с расширением ферзевого фланга — стратегический план чёрных."},
      {q:"Характер Сицилианской защиты?",opts:["Пассивная оборона","Быстрая ничья","Острая, динамичная игра","Только закрытые позиции"],ans:2,exp:"Сицилианская — самый острый ответ на 1.e4. Чёрные немедленно борются за инициативу, создавая обоюдоострые позиции."},
    ]
  }
];

// ═══════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════
const SQ = Math.min(50, Math.floor((typeof window!=="undefined" ? window.innerWidth-28 : 400)/8));

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Nunito:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #090912; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #12121e; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,215,0,.5)} 50%{box-shadow:0 0 0 10px rgba(255,215,0,0)} }
  @keyframes wrongFlash { 0%,100%{background:#b58863} 50%{background:#e05c6a} }
  @keyframes correctFlash { 0%,100%{background:#aaba38} 50%{background:#4caf50} }
  .fadeIn { animation: fadeIn .3s ease forwards; }
  .pulse { animation: pulse 1.2s infinite; }
  .card-hover { transition: transform .2s, border-color .2s; } .card-hover:hover { transform: translateY(-2px); }
  .tab-btn { transition: all .2s; } .tab-btn:hover { filter: brightness(1.2); }
  .nav-btn { transition: all .15s; } .nav-btn:hover:not(:disabled) { background: rgba(255,255,255,.25) !important; }
  .opt-btn { transition: all .2s; cursor: pointer; } .opt-btn:hover:not(:disabled) { filter: brightness(1.15); }
`;

// ═══════════════════════════════════════════
//  BOARD COMPONENT
// ═══════════════════════════════════════════
function Board({ board, flipped=false, highlights={}, onSquare, pulseSq=null }) {
  const rows = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
  const cols = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

  return (
    <div style={{display:"inline-block",borderRadius:6,overflow:"hidden",boxShadow:"0 12px 40px rgba(0,0,0,.7),0 0 0 3px #8B6914"}}>
      {rows.map(r => (
        <div key={r} style={{display:"flex"}}>
          {cols.map(c => {
            const light = (r+c)%2===0;
            const piece = board[r][c];
            const hl = highlights[`${r},${c}`];
            const isPulse = pulseSq && pulseSq[0]===r && pulseSq[1]===c;
            let bg = light ? "#f0d9b5" : "#b58863";
            if (hl==="last") bg = light ? "#cdd26e" : "#aaba38";
            if (hl==="sel") bg = "#7ec8e3";
            if (hl==="valid") bg = light ? "#98e898" : "#4aa84a";
            if (hl==="hint") bg = light ? "#ffe082" : "#ffa726";
            if (hl==="wrong") bg = "#e05c6a";
            if (hl==="correct") bg = "#4caf50";
            const showFile = flipped ? r===0 : r===7;
            const showRank = flipped ? c===7 : c===0;
            return (
              <div key={c} onClick={()=>onSquare?.(r,c)}
                className={isPulse?"pulse":""}
                style={{
                  width:SQ,height:SQ,backgroundColor:bg,position:"relative",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  cursor:onSquare?"pointer":"default",userSelect:"none",
                  transition:"background-color .15s",
                }}>
                {piece && (
                  <span style={{
                    fontSize:SQ*0.78,lineHeight:1,
                    color:piece[0]==="w"?"#fff":"#1a1005",
                    textShadow:piece[0]==="w"
                      ?"0 0 3px #000,0 0 6px #000,1px 2px 3px rgba(0,0,0,.9)"
                      :"0 1px 3px rgba(255,255,255,.3)",
                    filter:piece[0]==="w"?"drop-shadow(0 1px 2px rgba(0,0,0,1))":"none",
                    display:"block",
                  }}>{SYM[piece]}</span>
                )}
                {showRank&&<span style={{position:"absolute",top:2,left:3,fontSize:9,fontWeight:"700",color:light?"#b58863":"#f0d9b5",fontFamily:"Nunito,sans-serif"}}>{r2n(r)}</span>}
                {showFile&&<span style={{position:"absolute",bottom:2,right:3,fontSize:9,fontWeight:"700",color:light?"#b58863":"#f0d9b5",fontFamily:"Nunito,sans-serif"}}>{c2f(c)}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
//  LEARN MODE
// ═══════════════════════════════════════════
function LearnMode({ opening, positions }) {
  const [step, setStep] = useState(0);
  const total = opening.moves.length;
  const { board, changed } = positions[step];
  const highlights = {};
  changed.forEach(sq => highlights[sq]="last");
  const move = step>0 ? opening.moves[step-1] : null;

  const pairs = [];
  for (let i=0;i<opening.moves.length;i+=2)
    pairs.push({ n:Math.floor(i/2)+1, w:opening.moves[i], b:opening.moves[i+1], wi:i, bi:i+1 });

  return (
    <div className="fadeIn" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
      <Board board={board} flipped={opening.flip} highlights={highlights}/>

      <div style={{
        background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",
        borderRadius:14,padding:"14px 16px",width:"100%",minHeight:72,
      }}>
        {move ? (
          <>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:opening.color,fontWeight:700}}>{move.text}</span>
              <span style={{fontSize:11,color:"rgba(255,255,255,.4)",background:"rgba(255,255,255,.06)",padding:"2px 7px",borderRadius:10}}>
                {move.color==="w"?"♔ Белые":"♚ Чёрные"}
              </span>
            </div>
            <div style={{color:"rgba(255,255,255,.8)",fontSize:13,lineHeight:1.5}}>{move.note}</div>
          </>
        ) : (
          <div style={{color:"rgba(255,255,255,.45)",fontSize:13}}>Нажмите «Вперёд» для начала изучения дебюта</div>
        )}
      </div>

      {/* Move list */}
      <div style={{background:"rgba(255,255,255,.04)",borderRadius:12,padding:12,width:"100%"}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,.35)",marginBottom:8,fontFamily:"Nunito,sans-serif",letterSpacing:".05em",textTransform:"uppercase"}}>Ходы дебюта</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:3,alignItems:"center"}}>
          {pairs.map(p=>(
            <span key={p.n} style={{display:"flex",alignItems:"center",gap:2}}>
              <span style={{color:"rgba(255,255,255,.3)",fontSize:11,minWidth:18,fontFamily:"Nunito,sans-serif"}}>{p.n}.</span>
              {[p.w,p.b].filter(Boolean).map((m,i)=>{
                const idx = i===0?p.wi:p.bi;
                const active = step===idx+1;
                return (
                  <button key={i} onClick={()=>setStep(idx+1)} style={{
                    padding:"3px 7px",borderRadius:5,border:"none",
                    background:active?opening.color:"rgba(255,255,255,.1)",
                    color:active?"#fff":"rgba(255,255,255,.7)",
                    cursor:"pointer",fontSize:12,fontWeight:active?700:400,
                    fontFamily:"Nunito,sans-serif",transition:"all .15s",
                  }}>{m.san}</button>
                );
              })}
            </span>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div style={{display:"flex",gap:6}}>
        {[["⏮",0],["◀",Math.max(0,step-1)],["▶",Math.min(total,step+1)],["⏭",total]].map(([lbl,dest],i)=>(
          <button key={i} className="nav-btn" onClick={()=>setStep(dest)} disabled={dest===step&&(i<2?step===0:step===total)} style={{
            padding:"9px 14px",borderRadius:9,border:"none",
            background:"rgba(255,255,255,.12)",color:"#fff",
            cursor:"pointer",fontSize:14,opacity:dest===step?0.3:1,
            fontFamily:"Nunito,sans-serif",
          }}>{lbl}</button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  PRACTICE MODE
// ═══════════════════════════════════════════
function PracticeMode({ opening, positions }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("playing");
  const [feedback, setFeedback] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const total = opening.moves.length;
  const userCol = opening.playAs==="white"?"w":"b";
  const curMove = step<total ? opening.moves[step] : null;
  const isUserTurn = curMove && curMove.color===userCol;
  const expectedMf = step<total ? positions[step+1]?.mf : null;
  const expectedMt = step<total ? positions[step+1]?.mt : null;

  useEffect(() => {
    if (status==="completed") return;
    if (step>=total) { setStatus("completed"); return; }
    if (curMove && curMove.color!==userCol) {
      setAutoPlaying(true);
      const t = setTimeout(() => { setStep(s=>s+1); setAutoPlaying(false); setFeedback(null); }, 900);
      return () => clearTimeout(t);
    }
  }, [step, status]);

  const reset = () => { setStep(0); setSelected(null); setStatus("playing"); setFeedback(null); setShowHint(false); setAutoPlaying(false); };

  const { board } = positions[step];
  const highlights = {};
  if (step>0) positions[step].changed.forEach(sq => highlights[sq]="last");

  if (showHint && expectedMf && !selected) highlights[`${expectedMf[0]},${expectedMf[1]}`]="hint";
  if (showHint && expectedMt && selected) highlights[`${expectedMt[0]},${expectedMt[1]}`]="hint";
  if (selected) highlights[`${selected[0]},${selected[1]}`]="sel";

  const pulseSq = isUserTurn && !selected && expectedMf && !showHint ? expectedMf : null;

  const handleSquare = (r, c) => {
    if (!isUserTurn || autoPlaying || status==="completed") return;
    if (!selected) {
      const p = board[r][c];
      if (p && p[0]===userCol) { setSelected([r,c]); setShowHint(false); setFeedback(null); }
    } else {
      if (r===selected[0] && c===selected[1]) { setSelected(null); return; }
      const p = board[r][c];
      if (p && p[0]===userCol) { setSelected([r,c]); return; }
      const fromOk = expectedMf && selected[0]===expectedMf[0] && selected[1]===expectedMf[1];
      const toOk = expectedMt && r===expectedMt[0] && c===expectedMt[1];
      if (fromOk && toOk) {
        setStep(s=>s+1); setSelected(null); setShowHint(false);
        setFeedback({type:"ok",text:curMove.note});
      } else if (!fromOk) {
        setFeedback({type:"err",text:"Неверная фигура! Нажми «Подсказка»"});
        setSelected(null);
      } else {
        setFeedback({type:"err",text:"Неверное поле! Нажми «Подсказка»"});
        setSelected(null);
      }
    }
  };

  return (
    <div className="fadeIn" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
      <Board board={board} flipped={opening.flip} highlights={highlights} onSquare={handleSquare} pulseSq={pulseSq}/>

      <div style={{
        background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",
        borderRadius:14,padding:"14px 16px",width:"100%",minHeight:72,
      }}>
        {status==="completed" ? (
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:30,marginBottom:6}}>🎉</div>
            <div style={{color:"#4caf50",fontWeight:700,fontSize:15,marginBottom:10}}>Дебют пройден успешно!</div>
            <button onClick={reset} style={{padding:"8px 20px",borderRadius:9,border:"none",background:opening.color,color:"#fff",cursor:"pointer",fontSize:13,fontFamily:"Nunito,sans-serif",fontWeight:600}}>Повторить</button>
          </div>
        ) : autoPlaying ? (
          <div style={{color:"rgba(255,255,255,.5)",fontSize:13}}>⏳ Соперник думает...</div>
        ) : isUserTurn ? (
          <div>
            <div style={{fontSize:13,color:opening.color,fontWeight:600,marginBottom:4}}>
              🎯 Ваш ход ({opening.playAs==="white"?"♔ Белые":"♚ Чёрные"})
            </div>
            {feedback ? (
              <div style={{fontSize:13,color:feedback.type==="ok"?"#4caf50":"#e05c6a",lineHeight:1.4}}>{feedback.type==="ok"?"✅ ":""}{feedback.text}</div>
            ) : selected ? (
              <div style={{fontSize:13,color:"rgba(255,255,255,.6)"}}>Выбери поле для хода</div>
            ) : (
              <div style={{fontSize:13,color:"rgba(255,255,255,.6)"}}>Кликни на фигуру — она подсвечена золотым</div>
            )}
          </div>
        ) : (
          <div style={{color:"rgba(255,255,255,.4)",fontSize:13}}>Загрузка...</div>
        )}
      </div>

      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>setShowHint(true)} style={{padding:"9px 16px",borderRadius:9,border:"none",background:"rgba(255,165,0,.25)",color:"#ffb347",cursor:"pointer",fontSize:13,fontFamily:"Nunito,sans-serif",fontWeight:600}}>💡 Подсказка</button>
        <button onClick={reset} style={{padding:"9px 16px",borderRadius:9,border:"none",background:"rgba(255,255,255,.1)",color:"#fff",cursor:"pointer",fontSize:13,fontFamily:"Nunito,sans-serif"}}>🔄 Сначала</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  QUIZ MODE
// ═══════════════════════════════════════════
function QuizMode({ opening }) {
  const [qi, setQi] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [done, setDone] = useState(false);
  const quiz = opening.quiz;
  const q = quiz[qi];
  const score = answers.filter(a=>a).length;

  const choose = idx => {
    if (chosen!==null) return;
    setChosen(idx);
    setAnswers(a=>[...a, idx===q.ans]);
  };
  const next = () => {
    if (qi<quiz.length-1) { setQi(i=>i+1); setChosen(null); }
    else setDone(true);
  };
  const restart = () => { setQi(0); setChosen(null); setAnswers([]); setDone(false); };

  if (done) {
    const pct = (score/quiz.length)*100;
    const emoji = pct===100?"🏆":pct>=60?"🎓":"📚";
    const msg = pct===100?"Превосходно! Вы знаете этот дебют!":pct>=60?"Хороший результат! Продолжайте практику.":"Повторите теорию и попробуйте снова.";
    return (
      <div className="fadeIn" style={{textAlign:"center",padding:"20px 0"}}>
        <div style={{fontSize:56,marginBottom:16}}>{emoji}</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:700,color:opening.color,marginBottom:4}}>{score}/{quiz.length}</div>
        <div style={{color:"rgba(255,255,255,.6)",fontSize:14,marginBottom:24}}>{msg}</div>
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:24}}>
          {answers.map((ok,i)=><span key={i} style={{fontSize:18}}>{ok?"✅":"❌"}</span>)}
        </div>
        <button onClick={restart} style={{padding:"11px 24px",borderRadius:11,border:"none",background:opening.color,color:"#fff",cursor:"pointer",fontSize:14,fontFamily:"Nunito,sans-serif",fontWeight:700}}>Пройти снова</button>
      </div>
    );
  }

  return (
    <div className="fadeIn" style={{paddingBottom:4}}>
      {/* Progress */}
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
        <span style={{fontSize:12,color:"rgba(255,255,255,.4)",fontFamily:"Nunito,sans-serif"}}>Вопрос {qi+1} / {quiz.length}</span>
        <span style={{fontSize:12,color:"rgba(255,255,255,.4)",fontFamily:"Nunito,sans-serif"}}>{score} правильных</span>
      </div>
      <div style={{height:4,background:"rgba(255,255,255,.08)",borderRadius:2,marginBottom:18}}>
        <div style={{height:"100%",width:`${(qi/quiz.length)*100}%`,background:opening.color,borderRadius:2,transition:"width .4s"}}/>
      </div>

      {/* Question */}
      <div style={{background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,padding:"16px",marginBottom:14,fontSize:15,lineHeight:1.55,fontWeight:600,fontFamily:"Nunito,sans-serif"}}>
        {q.q}
      </div>

      {/* Options */}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
        {q.opts.map((opt,i)=>{
          let bg="rgba(255,255,255,.07)", border="1px solid rgba(255,255,255,.08)", col="#e2e8f0";
          if (chosen!==null) {
            if (i===q.ans) { bg="rgba(76,175,80,.2)"; border="1px solid #4caf50"; col="#81c784"; }
            else if (i===chosen) { bg="rgba(224,92,106,.2)"; border="1px solid #e05c6a"; col="#ef9a9a"; }
          }
          return (
            <button key={i} className="opt-btn" onClick={()=>choose(i)} disabled={chosen!==null} style={{
              padding:"12px 16px",borderRadius:12,border,background:bg,color:col,
              textAlign:"left",fontSize:13,lineHeight:1.4,fontFamily:"Nunito,sans-serif",
            }}>
              <span style={{color:"rgba(255,255,255,.35)",marginRight:9,fontWeight:700}}>{"ABCD"[i]}.</span>{opt}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {chosen!==null && (
        <div style={{
          background:chosen===q.ans?"rgba(76,175,80,.12)":"rgba(224,92,106,.12)",
          border:`1px solid ${chosen===q.ans?"rgba(76,175,80,.35)":"rgba(224,92,106,.35)"}`,
          borderRadius:12,padding:12,marginBottom:14,fontSize:13,lineHeight:1.5,
          fontFamily:"Nunito,sans-serif",color:"rgba(255,255,255,.8)",
        }}>
          <span style={{fontWeight:700,marginRight:4}}>{chosen===q.ans?"✅ Верно!":"❌ Неверно."}</span>{q.exp}
        </div>
      )}

      {chosen!==null && (
        <button onClick={next} style={{
          width:"100%",padding:"12px",borderRadius:12,border:"none",
          background:opening.color,color:"#fff",cursor:"pointer",
          fontSize:14,fontWeight:700,fontFamily:"Nunito,sans-serif",
        }}>
          {qi<quiz.length-1?"Следующий вопрос →":"Посмотреть результат →"}
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
//  OPENING DETAIL
// ═══════════════════════════════════════════
function OpeningDetail({ opening, onBack }) {
  const [tab, setTab] = useState("learn");
  const positions = useMemo(() => buildPositions(opening.moves), [opening.id]);

  return (
    <div style={{maxWidth:520,margin:"0 auto",padding:"14px 12px 60px"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <button onClick={onBack} style={{padding:"8px 14px",borderRadius:9,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.07)",color:"#fff",cursor:"pointer",fontSize:13,fontFamily:"Nunito,sans-serif"}}>← Назад</button>
        <div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,lineHeight:1.2}}>{opening.emoji} {opening.name}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.45)",marginTop:2}}>{opening.tagline}</div>
        </div>
      </div>

      {/* Description */}
      <div style={{background:"rgba(255,255,255,.05)",borderRadius:12,padding:"12px 14px",marginBottom:14,fontSize:13,color:"rgba(255,255,255,.7)",lineHeight:1.6,borderLeft:`3px solid ${opening.color}`}}>
        {opening.desc}
        <span style={{marginLeft:8,padding:"2px 8px",borderRadius:8,fontSize:11,fontWeight:700,background:opening.playAs==="white"?"rgba(255,255,255,.12)":"rgba(0,0,0,.35)",color:opening.playAs==="white"?"#fff":"#ccc"}}>
          {opening.playAs==="white"?"♔ Белые":"♚ Чёрные"}
        </span>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:16,background:"rgba(255,255,255,.04)",borderRadius:12,padding:5}}>
        {[["learn","📚 Изучение"],["practice","♟ Практика"],["quiz","📝 Тест"]].map(([id,label])=>(
          <button key={id} className="tab-btn" onClick={()=>setTab(id)} style={{
            flex:1,padding:"9px 4px",borderRadius:9,border:"none",
            background:tab===id?opening.color:"transparent",
            color:tab===id?"#fff":"rgba(255,255,255,.5)",
            cursor:"pointer",fontSize:12,fontWeight:tab===id?700:500,
            fontFamily:"Nunito,sans-serif",
          }}>{label}</button>
        ))}
      </div>

      {tab==="learn" && <LearnMode key={opening.id+"l"} opening={opening} positions={positions}/>}
      {tab==="practice" && <PracticeMode key={opening.id+"p"} opening={opening} positions={positions}/>}
      {tab==="quiz" && <QuizMode key={opening.id+"q"} opening={opening}/>}
    </div>
  );
}

// ═══════════════════════════════════════════
//  HOME
// ═══════════════════════════════════════════
function Home({ onSelect }) {
  return (
    <div style={{maxWidth:520,margin:"0 auto",padding:"24px 12px 60px"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{fontSize:52,marginBottom:8,lineHeight:1}}>♟</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700,background:"linear-gradient(135deg,#C8A84B,#F5D97A)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:6}}>Шахматные дебюты</h1>
        <p style={{color:"rgba(255,255,255,.45)",fontSize:13}}>4 дебюта · Теория · Практика · Тест</p>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {OPENINGS.map(op=>(
          <div key={op.id} className="card-hover" onClick={()=>onSelect(op)} style={{
            background:"rgba(255,255,255,.05)",borderRadius:16,padding:"16px",
            cursor:"pointer",border:"1px solid rgba(255,255,255,.08)",
            position:"relative",overflow:"hidden",
          }}>
            <div style={{position:"absolute",top:0,right:0,width:120,height:"100%",background:op.gradient,opacity:.12,borderRadius:"0 15px 15px 0"}}/>
            <div style={{display:"flex",alignItems:"center",gap:12,position:"relative"}}>
              <div style={{fontSize:34,width:44,textAlign:"center"}}>{op.emoji}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,marginBottom:2}}>{op.name}</div>
                <div style={{color:"rgba(255,255,255,.5)",fontSize:12,lineHeight:1.3}}>{op.tagline}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,shrink:0}}>
                <span style={{padding:"3px 10px",borderRadius:8,fontSize:11,fontWeight:700,background:op.playAs==="white"?"rgba(255,255,255,.15)":"rgba(0,0,0,.4)",color:op.playAs==="white"?"#fff":"#ccc",border:"1px solid rgba(255,255,255,.1)"}}>
                  {op.playAs==="white"?"♔ Белые":"♚ Чёрные"}
                </span>
                <span style={{fontSize:10,color:"rgba(255,255,255,.3)"}}>{op.moves.length} ходов</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{textAlign:"center",marginTop:24,color:"rgba(255,255,255,.2)",fontSize:11,fontFamily:"Nunito,sans-serif"}}>
        Нажмите на дебют для начала обучения
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
//  APP
// ═══════════════════════════════════════════
export default function App() {
  const [opening, setOpening] = useState(null);

  return (
    <div style={{minHeight:"100vh",background:"#090912",color:"#e2e8f0",fontFamily:"'Nunito',sans-serif"}}>
      <style>{css}</style>
      {opening
        ? <OpeningDetail opening={opening} onBack={()=>setOpening(null)}/>
        : <Home onSelect={setOpening}/>
      }
    </div>
  );
}
