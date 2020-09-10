import gsap from "gsap"
const lane = Math.floor(window.parent.screen.height / 62);
const lanes = Array(lane);
const queue = [];
lanes.fill(false);
let oldComment = "";
const sleep = (msec) => new Promise(resolve => setTimeout(resolve, msec));


window.onload = () => {
    // WebSocket
    const socket = new WebSocket("wss://best-friends.chat/api/v1/streaming/?stream=public:local");
    // 受信
    socket.addEventListener("message", receive);
    // エラーメッセージ
    socket.addEventListener("error", () => console.log("エラーが発生しました。"));
}

/**
 * 
 * @param {String} content 
 */
async function createText(content, contentLength) {
    let i = 0;
    let check = false;
    const divText = document.createElement("div");
    divText.className = "baseComment";
    for (i = 0; i < lanes.length; i++){
        if (lanes[i] === false){
            const top = i * 62;
            divText.style.top = `${top}px`;
            divText.insertAdjacentHTML("beforeend", `<p class="comment${i}">${content}</p>`);
            lanes[i] = true;
            check = true;
            break;
        }
    }

    // レーンが全て埋まっている場合、キューに溜める
    if (!check){
        queue.push([content, contentLength]);
        return;
    }

    const container = document.getElementsByClassName("container")[0];
    container.appendChild(divText);
    if (document.getElementsByClassName(`comment${i}`).length > 0){
        gsap.to(divText, {duration: 8, x: -1*(window.parent.screen.width + divText.clientWidth), ease: "none"});
        const sleepTime = contentLength <= 10 ? 4000 : 5000;
        await sleep(sleepTime);
        lanes[i] = false;
        await sleep(8000 - sleepTime);
        container.removeChild(divText);
        

        // キューが溜まっていれば消化
        if (queue.length > 0){
            for (let j = 0; j < queue.length; j++){
                createText(queue[i][0], queue[i][1]);
                queue.shift();
            }
        }
    }
}

function receive(event){
    // updateじゃなかったら処理を抜ける
    const res = JSON.parse(event.data);
    if (res.event !== "update") {
        return;
    }

    // content
    const payload = JSON.parse(res.payload);
    let content = payload.content;  
    content = content.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'');
    const contentLength = content.length;
    
    // URL除去
    content = content.replace(/http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=~]*)?/g, "");
    // 改行除去
    content = content.replace(/\n/g, "<br />");

    // トゥートが空文字の場合表示させない
    if (content.length === 0){
        return;
    }else if (content.length > 100){
        // 内容が長すぎるので100文字まで表示
        content = content.substring(0, 100) + "...";
    }

    // avatar URL
    const account = payload.account;
    const avatar = account.avatar;

    // 先頭にアバター連結
    content = `<span><img class="icon" src="${avatar}"></span> ` + content;

    // 絵文字置換
    if (payload.all_emojis.length > 0){
        payload.all_emojis.forEach(emoji => {
            content = content.replace(new RegExp(`:${emoji.shortcode}:`, "g") , `<span><img class="emoji" src="${emoji.url}"></span>`);
        });
    }

    createText(content, contentLength);
}
