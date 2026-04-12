const video = document.querySelector("#video");
const masks = document.querySelectorAll(".maskContainer");
const globalHud = document.querySelector(".globalHud");
let isHoveringMask = false;

const state = new Map();

document.addEventListener("mousemove", e => {
    if (!isHoveringMask) {
        globalHud.innerHTML = `X: ${e.clientX}px <br/> Y: ${e.clientY}px`;
    }

    globalHud.style.transform = `translate3d(${e.clientX + 2}px, ${e.clientY + 2}px, 0);`
});

function updateCoords(mask) {
    const s = state.get(mask);
    mask.querySelector(".coords").textContent = `X: ${Math.round(s.x)}px Y:${Math.round(s.y)}px`;
}

function drawClipped(ctx, video, rect) {
    const videoAspect = video.videoWidth / video.videoHeight;
    const windowAspect = window.innerWidth / window.innerHeight;

    let dw, dh, dx, dy;

    if (videoAspect > windowAspect) {
        dh = window.innerHeight;
        dw = dh * videoAspect;
        dx = (window.innerWidth - dw) / 2;
    } else {
        dw = window.innerWidth;
        dh = dw / videoAspect;
        dx = 0;
        dy = (window.innerHeight - dh) / 2;
    }


    const scaleX = video.videoWidth / dw;
    const scaleY = video.videoHeight / dh;

    ctx.drawImage(
        video,
        (rect.x - dx) * scaleX,
        (rect.y - dy) * scaleY,
        rect.w * scaleX,
        rect.h * scaleY,
        0,
        0,
        rect.w,
        rect.h,
    );
}

