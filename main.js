const video = document.querySelector("#video");
const masks = document.querySelectorAll(".maskContainer");
const globalHud = document.querySelector(".globalHud");
let isHoveringMask = false;

const state = new Map();
const ctxCache = new Map();

let mouseX = 0, mouseY = 0;

// シェーダーのソースコード
const vertSrc = `
    attribute vec2 position;
    void main() {
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

const fragSrc = `
    void main() {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

function createProgram(gl, vertSrc, fragSrc) {
    const vert = createShader(gl, gl.VERTEX_SHADER, vertSrc);
    const frag = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    const program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    return program;
}

function initWebGL(canvas) {
    const gl = canvas.getContext("webgl");

    const program = createProgram(gl, vertSrc, fragSrc);
    gl.useProgram(program);

    // 画面全体をカバーする四角形の頂点
    const vertices = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    return gl;
}

document.addEventListener("mousemove", e => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!isHoveringMask) {
        globalHud.innerHTML = `X: ${mouseX}px <br/> Y: ${mouseY}px`;
    }

    globalHud.style.transform = `translate3d(${mouseX + 2}px, ${mouseY + 2}px, 0)`
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
        dy = 0;
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

function initMasks() {
    masks.forEach((mask, i) => {
        const r = mask.getBoundingClientRect();

        state.set(mask, {
            x: r.left,
            y: r.top,
            w: r.width,
            h: r.height,
            dragging: false,
            ox: 0,
            oy: 0,
            isWebGL: i === 0  // box1だけWebGL
        });

        mask.style.left = "0";
        mask.style.top = "0";
        mask.style.transform = `translate3d(${r.left}px, ${r.top}px, 0)`;

        mask.addEventListener("mouseenter", () => {
            isHoveringMask = true;
            globalHud.textContent = "GRAB";
        });
        mask.addEventListener("mouseleave", () => {
            isHoveringMask = false;
        });
    });
}

function initCanvases() {
    masks.forEach((mask) => {
        const s = state.get(mask);
        const canvas = mask.querySelector("canvas");
        canvas.width = s.w;
        canvas.height = s.h;

        if (s.isWebGL) {
            const gl = initWebGL(canvas);
            ctxCache.set(mask, { gl, isWebGL: true });
        } else {
            ctxCache.set(mask, { ctx: canvas.getContext("2d"), isWebGL: false });
        }
    });
}

function draw() {
    masks.forEach(mask => {
        const s = state.get(mask);
        const cache = ctxCache.get(mask);

        if (s.dragging) {
            s.x = mouseX - s.ox;
            s.y = mouseY - s.oy;
            mask.style.transform = `translate3d(${s.x}px,${s.y}px,0)`;
        }

        if (cache.isWebGL) {
            // WebGL描画（赤く塗る）
            const gl = cache.gl;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        } else {
            // 2D描画（動画）
            const ctx = cache.ctx;
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            drawClipped(ctx, video, s);
        }

        updateCoords(mask);
    });

    requestAnimationFrame(draw);
}

masks.forEach(mask => {
    mask.addEventListener("mousedown", e => {
        const s = state.get(mask);
        s.dragging = true;
        s.ox = e.clientX - s.x;
        s.oy = e.clientY - s.y;
        mask.style.cursor = "grabbing";
    });

    document.addEventListener("mouseup", () => {
        const s = state.get(mask);
        s.dragging = false;
        mask.style.cursor = "grab";
    });
});

video.addEventListener("playing", () => {
    initMasks();
    initCanvases();
    draw();
});