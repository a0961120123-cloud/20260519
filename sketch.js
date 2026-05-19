// ==========================================
// 完整互動專案：手部感測與電腦猜拳
// 包含：全螢幕、置中影像、五指連線、指尖水泡、猜拳判定
// ==========================================

let video;
let handPose;
let hands = [];
let bubbles = []; // 儲存所有水泡物件的陣列

// 猜拳遊戲相關變數
let playerChoice = "請出拳...";
let computerChoice = "等待中...";
let gameResult = "看看誰會贏？";
let choices = ["✊ 石頭", "✌️ 剪刀", "🖐️ 布"];
let lastMatchTime = 0; // 紀錄上一次判定的時間（毫秒），避免太靈敏一直跳

function preload() {
  // 初始化 HandPose 模型（開啟翻轉，符合鏡像習慣）
  handPose = ml5.handPose({ flipped: true });
}

function setup() {
  // 1. 建立全螢幕畫布
  createCanvas(windowWidth, windowHeight);
  
  // 2. 建立攝影機並設定鏡像翻轉
  video = createCapture(VIDEO, { flipped: true });
  video.hide();

  // 3. 開始持續偵測手勢
  handPose.detectStart(video, gotHands);
}

function gotHands(results) {
  hands = results;
}

function draw() {
  // 4. 設定背景顏色為 #e7c6ff
  background('#e7c6ff');

  // 5. 繪製全螢幕畫布正上方的學生資訊文字
  fill(50); // 深灰色文字
  noStroke();
  textSize(32);
  textAlign(CENTER, TOP);
  text("414730910陳益宏文字", width / 2, 20);

  // 6. 計算中央影像顯示的大小（畫布寬高的 50%）與置中偏移量
  let imgW = width * 0.5;
  let imgH = height * 0.5;
  let offsetX = (width - imgW) / 2;
  let offsetY = (height - imgH) / 2;

  // 繪製攝影機影像在畫布正中間
  image(video, offsetX, offsetY, imgW, imgH);

  // 7. 繪製下方的遊戲 UI 資訊看板
  drawGameUI(offsetY + imgH);

  // 8. 處理手勢偵測、畫線、畫圓與產生水泡
  if (hands.length > 0) {
    for (let hand of hands) {
      if (hand.confidence > 0.1) {
        
        // 每 0.5 秒（500毫秒）判定一次手勢，讓遊戲結果比較穩定不閃爍
        if (millis() - lastMatchTime > 500) {
          judgeGesture(hand);
        }

        // --- 繪製手指上的骨架連線 ---
        strokeWeight(3);
        // 根據左右手給予不同顏色
        if (hand.handedness == "Left") {
          stroke(255, 0, 255); // 左手紫紅色線
        } else {
          stroke(255, 255, 0); // 右手黃色線
        }

        // 執行五組指節連線（傳入置中參數確保對齊）
        drawFinger(hand, 0, 4, offsetX, offsetY, imgW, imgH);   // 大拇指
        drawFinger(hand, 5, 8, offsetX, offsetY, imgW, imgH);   // 食指
        drawFinger(hand, 9, 12, offsetX, offsetY, imgW, imgH);  // 中指
        drawFinger(hand, 13, 16, offsetX, offsetY, imgW, imgH); // 無名指
        drawFinger(hand, 17, 20, offsetX, offsetY, imgW, imgH); // 小指

        // --- 繪製關節點小圓圈並在指尖產生水泡 ---
        noStroke();
        for (let i = 0; i < hand.keypoints.length; i++) {
          let kp = hand.keypoints[i];
          
          // 座標轉換：將影片中的座標等比例映射到畫布置中的影像區塊上
          let kx = map(kp.x, 0, video.width, offsetX, offsetX + imgW);
          let ky = map(kp.y, 0, video.height, offsetY, offsetY + imgH);
          
          // 畫關節點小圓圈
          if (hand.handedness == "Left") fill(255, 0, 255, 200);
          else fill(255, 255, 0, 200);
          circle(kx, ky, 10);

          // 在指尖（4, 8, 12, 16, 20）產生水泡
          if (i === 4 || i === 8 || i === 12 || i === 16 || i === 20) {
            if (frameCount % 5 === 0) { // 每 5 幀產生一個，維持畫面乾淨
              bubbles.push(new Bubble(kx, ky));
            }
          }
        }
      }
    }
  } else {
    // 畫面中沒有偵測到手時的提示
    playerChoice = "請把手放到畫面中...";
  }

  // 9. 更新並繪製所有上升的水泡
  for (let i = bubbles.length - 1; i >= 0; i--) {
    bubbles[i].update();
    bubbles[i].display();
    if (bubbles[i].isPopped) {
      bubbles.splice(i, 1); // 破掉的水泡就從陣列刪除
    }
  }
}

// 🖐️ 手勢判定邏輯功能
function judgeGesture(hand) {
  // 取得關鍵點：指尖與指根
  let indexTip = hand.keypoints[8];
  let middleTip = hand.keypoints[12];
  let ringTip = hand.keypoints[16];
  let pinkyTip = hand.keypoints[20];

  let indexBase = hand.keypoints[5];
  let middleBase = hand.keypoints[9];
  let ringBase = hand.keypoints[13];
  let pinkyBase = hand.keypoints[17];

  // 判斷手指是否有伸直（指尖的 Y 軸座標小於指根的 Y 軸座標代表伸直）
  let isIndexOpen = indexTip.y < indexBase.y;
  let isMiddleOpen = middleTip.y < middleBase.y;
  let isRingOpen = ringTip.y < ringBase.y;
  let isPinkyOpen = pinkyTip.y < pinkyBase.y;

  let currentPlay = "";

  // 猜拳規則判定：
  if (isIndexOpen && isMiddleOpen && isRingOpen && isPinkyOpen) {
    currentPlay = "🖐️ 布";
  } else if (isIndexOpen && isMiddleOpen && !isRingOpen && !isPinkyOpen) {
    currentPlay = "✌️ 剪刀";
  } else if (!isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen) {
    currentPlay = "✊ 石頭";
  } else {
    currentPlay = "偵測中...";
  }

  // 如果玩家出拳動作明確，且跟上一次狀態不同，就觸發電腦出拳對決
  if (currentPlay !== "偵測中..." && currentPlay !== playerChoice) {
    playerChoice = currentPlay;
    
    // 電腦隨機選一個拳
    let randIdx = floor(random(3));
    computerChoice = choices[randIdx];
    
    // 計算勝負結果
    calculateWinner(playerChoice, computerChoice);
    lastMatchTime = millis(); // 更新判定時間
  }
}

// 🏆 勝負計算功能
function calculateWinner(p, c) {
  if (p === c) {
    gameResult = "平手！再試一次 🤝";
  } else if (
    (p === "✊ 石頭" && c === "✌️ 剪刀") ||
    (p === "✌️ 剪刀" && c === "🖐️ 布") ||
    (p === "🖐️ 布" && c === "✊ 石頭")
  ) {
    gameResult = "🎉 你贏了！太強了 👍";
  } else {
    gameResult = "❌ 電腦贏了！再接再厲 😂";
  }
}

// 🎨 繪製遊戲資訊介面 UI
function drawGameUI(yPos) {
  push();
  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  
  // 白色半透明背景板（位於中央影像下方約 60px 處）
  fill(255, 255, 255, 180);
  noStroke();
  rect(width / 2, yPos + 60, 500, 100, 15);

  // 顯示雙方出拳內容
  textSize(20);
  fill(0);
  text(`你出：${playerChoice}`, width / 2 - 120, yPos + 45);
  text(`電腦出：${computerChoice}`, width / 2 + 120, yPos + 45);
  
  // 顯示勝負粗體大字
  textSize(24);
  textStyle(BOLD);
  fill('#5e548e'); // 使用深紫色強調
  text(gameResult, width / 2, yPos + 85);
  pop();
}

// 輔助功能：負責座標轉換與畫線
function drawFinger(hand, start, end, ox, oy, iw, ih) {
  for (let i = start; i < end; i++) {
    let pt1 = hand.keypoints[i];
    let pt2 = hand.keypoints[i + 1];

    let x1 = map(pt1.x, 0, video.width, ox, ox + iw);
    let y1 = map(pt1.y, 0, video.height, oy, oy + ih);
    let x2 = map(pt2.x, 0, video.width, ox, ox + iw);
    let y2 = map(pt2.y, 0, video.height, oy, oy + ih);

    line(x1, y1, x2, y2);
  }
}

// 🧼 水泡類別 (Bubble Class) - 管理水泡動態
class Bubble {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = random(8, 22); // 隨機水泡大小
    this.speedY = random(-2, -4.5); // 向上飄移的速度
    this.speedX = random(-0.5, 0.5); // 左右微幅晃動
    this.alpha = 150; // 起始透明度
    this.isPopped = false;
  }

  update() {
    this.y += this.speedY;
    this.x += this.speedX;
    this.alpha -= 1.2; // 隨著時間慢慢變透明

    // 設定破裂條件：到達螢幕頂部附近（文字下方）或完全透明時
    if (this.y < 60 || this.alpha <= 0) {
      this.isPopped = true;
    }
  }

  display() {
    push();
    stroke(255, this.alpha); // 白色細邊框
    strokeWeight(1);
    fill(200, 230, 255, this.alpha * 0.4); // 半透明淡藍色水泡感
    circle(this.x, this.y, this.size);
    pop();
  }
}

// 視窗大小改變時，自動重設畫布尺寸
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
