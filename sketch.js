// ==========================================
// 跨平台終極相容版：手部感測與電腦猜拳
// 支援 Android 直開、完美解鎖 iOS 卡 LOADING 問題
// ==========================================

let video;
let handPose;
let hands = [];
let bubbles = [];

// 猜拳遊戲相關變數
let playerChoice = "請出拳...";
let computerChoice = "等待中...";
let gameResult = "看看誰會贏？";
let choices = ["✊ 石頭", "✌️ 剪刀", "🖐️ 布"];
let lastMatchTime = 0;

// iOS 啟動鎖
let isCameraStarted = false; 

function preload() {
  // 💡 移除所有參數，用最乾淨的方式載入模型（減少 iOS 載入失敗率）
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // 💡 Android 或電腦如果支援直開，這裡會嘗試建立；iOS 如果擋下來，就靠下面的點擊解鎖
  video = createCapture(VIDEO, function(stream) {
    isCameraStarted = true; // 如果成功啟動，就直接解鎖
  });
  video.hide();

  handPose.detectStart(video, gotHands);
}

function gotHands(results) {
  hands = results;
}

// 💡 專門做給 iPhone 的解鎖大招：如果卡在 LOADING，點一下螢幕強制喚醒相機
function touchStarted() {
  if (!isCameraStarted && video) {
    video.remove(); // 把原本卡住的相機拔掉
    
    // 用最毫無雜質的純淨寫法重新呼叫鏡頭
    video = createCapture(VIDEO);
    video.hide();
    
    handPose.detectStart(video, gotHands);
    isCameraStarted = true;
  }
  // 處理 iOS 聲音與點擊音訊環境解鎖
  if (getAudioContext().state === 'suspended') {
    getAudioContext().resume();
  }
  return false; 
}

function draw() {
  background('#e7c6ff');

  // 1. 畫布正上方的學生資訊文字
  fill(50);
  noStroke();
  textSize(32);
  textAlign(CENTER, TOP);
  text("414730910陳益宏文字", width / 2, 20);

  // 🛑 如果 iPhone 還是卡在讀取，顯示引導畫面提示點擊
  if (!isCameraStarted || !video) {
    fill(94, 84, 142);
    textSize(24);
    textAlign(CENTER, CENTER);
    text("⏳ 遊戲載入中...\n\n如果您使用 iPhone 且畫面沒反應\n👉 請點擊螢幕任意地方 👈\n強制解鎖相機權限！", width / 2, height / 2);
    return; 
  }

  // --- 以下為原本的猜拳與水泡邏輯，完全保留 ---
  let imgW = width * 0.5;
  let imgH = height * 0.5;
  let offsetX = (width - imgW) / 2;
  let offsetY = (height - imgH) / 2;

  // 繪製攝影機影像
  image(video, offsetX, offsetY, imgW, imgH);

  drawGameUI(offsetY + imgH);

  if (hands.length > 0) {
    for (let hand of hands) {
      if (hand.confidence > 0.1) {
        
        if (millis() - lastMatchTime > 500) {
          judgeGesture(hand);
        }

        strokeWeight(3);
        stroke(hand.handedness == "Left" ? color(255, 0, 255) : color(255, 255, 0));
        drawFinger(hand, 0, 4, offsetX, offsetY, imgW, imgH);   
        drawFinger(hand, 5, 8, offsetX, offsetY, imgW, imgH);   
        drawFinger(hand, 9, 12, offsetX, offsetY, imgW, imgH);  
        drawFinger(hand, 13, 16, offsetX, offsetY, imgW, imgH); 
        drawFinger(hand, 17, 20, offsetX, offsetY, imgW, imgH); 

        noStroke();
        for (let i = 0; i < hand.keypoints.length; i++) {
          let kp = hand.keypoints[i];
          let kx = map(kp.x, 0, video.width, offsetX, offsetX + imgW);
          let ky = map(kp.y, 0, video.height, offsetY, offsetY + imgH);
          
          fill(hand.handedness == "Left" ? [255, 0, 255, 200] : [255, 255, 0, 200]);
          circle(kx, ky, 10);

          if (i === 4 || i === 8 || i === 12 || i === 16 || i === 20) {
            if (frameCount % 5 === 0) {
              bubbles.push(new Bubble(kx, ky));
            }
          }
        }
      }
    }
  } else {
    playerChoice = "請把手放到畫面中...";
  }

  for (let i = bubbles.length - 1; i >= 0; i--) {
    bubbles[i].update();
    bubbles[i].display();
    if (bubbles[i].isPopped) {
      bubbles.splice(i, 1);
    }
  }
}

// 🖐️ 手勢判定邏輯功能
function judgeGesture(hand) {
  let indexTip = hand.keypoints[8];
  let middleTip = hand.keypoints[12];
  let ringTip = hand.keypoints[16];
  let pinkyTip = hand.keypoints[20];
  let indexBase = hand.keypoints[5];
  let middleBase = hand.keypoints[9];
  let ringBase = hand.keypoints[13];
  let pinkyBase = hand.keypoints[17];

  let isIndexOpen = indexTip.y < indexBase.y;
  let isMiddleOpen = middleTip.y < middleBase.y;
  let isRingOpen = ringTip.y < ringBase.y;
  let isPinkyOpen = pinkyTip.y < pinkyBase.y;

  let currentPlay = "";

  if (isIndexOpen && isMiddleOpen && isRingOpen && isPinkyOpen) {
    currentPlay = "🖐️ 布";
  } else if (isIndexOpen && isMiddleOpen && !isRingOpen && !isPinkyOpen) {
    currentPlay = "✌️ 剪刀";
  } else if (!isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen) {
    currentPlay = "✊ 石頭";
  } else {
    currentPlay = "偵測中...";
  }

  if (currentPlay !== "偵測中..." && currentPlay !== playerChoice) {
    playerChoice = currentPlay;
    let randIdx = floor(random(3));
    computerChoice = choices[randIdx];
    calculateWinner(playerChoice, computerChoice);
    lastMatchTime = millis();
  }
}

// 🏆 勝負計算
function calculateWinner(p, c) {
  if (p === c) gameResult = "平手！再試一次 🤝";
  else if ((p === "✊ 石頭" && c === "✌️ 剪刀") || (p === "✌️ 剪刀" && c === "🖐️ 布") || (p === "🖐️ 布" && c === "✊ 石頭")) {
    gameResult = "🎉 你贏了！太強了 👍";
  } else {
    gameResult = "❌ 電腦贏了！再接再厲 😂";
  }
}

// 🎨 繪製遊戲 UI
function drawGameUI(yPos) {
  push();
  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  fill(255, 255, 255, 180);
  noStroke();
  rect(width / 2, yPos + 60, 500, 100, 15);
  textSize(20);
  fill(0);
  text(`你出：${playerChoice}`, width / 2 - 120, yPos + 45);
  text(`電腦出：${computerChoice}`, width / 2 + 120, yPos + 45);
  textSize(24);
  textStyle(BOLD);
  fill('#5e548e');
  text(gameResult, width / 2, yPos + 85);
  pop();
}

// 輔助功能：畫指節線
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

// 🧼 水泡物件
class Bubble {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = random(8, 22);
    this.speedY = random(-2, -4.5);
    this.speedX = random(-0.5, 0.5);
    this.alpha = 150;
    this.isPopped = false;
  }
  update() {
    this.y += this.speedY;
    this.x += this.speedX;
    this.alpha -= 1.2;
    if (this.y < 60 || this.alpha <= 0) this.isPopped = true;
  }
  display() {
    push();
    stroke(255, this.alpha);
    strokeWeight(1);
    fill(200, 230, 255, this.alpha * 0.4);
    circle(this.x, this.y, this.size);
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}