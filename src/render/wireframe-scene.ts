// トップページの背景で回る 3D のワイヤーフレーム。Three.js を使わず、Canvas 2D で透視投影して線を引く。
// 動きを減らす設定のときは 1 コマだけ描く。画面外にあるときは止める。

type Vec3 = [number, number, number]
type Mesh = { vertices: Vec3[]; edges: Array<[number, number]> }

const TETRAHEDRON: Mesh = {
  vertices: [
    [1, 1, 1],
    [-1, -1, 1],
    [-1, 1, -1],
    [1, -1, -1],
  ],
  edges: [
    [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3],
  ],
}

const OCTAHEDRON: Mesh = {
  vertices: [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
  ],
  edges: [
    [0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2],
  ],
}

// 三角柱（⊿ のようなプリズム）
const PRISM: Mesh = (() => {
  const tri = [0, 1, 2].map(i => {
    const a = (i * Math.PI * 2) / 3 - Math.PI / 2
    return [Math.cos(a), Math.sin(a)] as const
  })
  return {
    vertices: [...tri.map(([x, y]): Vec3 => [x, y, -0.8]), ...tri.map(([x, y]): Vec3 => [x, y, 0.8])],
    edges: [
      [0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [0, 3], [1, 4], [2, 5],
    ],
  }
})()

type Body = {
  mesh: Mesh
  position: Vec3
  scale: number
  speed: Vec3
  phase: Vec3
  color: string
}

const BODIES: Body[] = [
  { mesh: PRISM, position: [0.9, -0.9, 3.2], scale: 1.2, speed: [0.11, 0.17, 0.05], phase: [0.3, 1.1, 0], color: '#5ce1e6' },
  { mesh: TETRAHEDRON, position: [-1.3, 0.8, 4.5], scale: 0.9, speed: [0.07, -0.13, 0.09], phase: [1.2, 0.4, 2], color: '#b388ff' },
  { mesh: OCTAHEDRON, position: [1.6, 1.4, 5.5], scale: 0.8, speed: [-0.09, 0.08, 0.12], phase: [2.1, 0.2, 1], color: '#ff6ec7' },
  { mesh: TETRAHEDRON, position: [-0.6, -1.8, 6.5], scale: 0.7, speed: [0.12, 0.05, -0.07], phase: [0.7, 2.5, 0.3], color: '#5ce1e6' },
  { mesh: PRISM, position: [-2.2, -0.4, 7.5], scale: 0.9, speed: [-0.05, 0.1, 0.06], phase: [1.7, 0.9, 2.4], color: '#ff6ec7' },
]

function rotate([x, y, z]: Vec3, [ax, ay, az]: Vec3): Vec3 {
  // X → Y → Z の順に回す
  let y1 = y * Math.cos(ax) - z * Math.sin(ax)
  let z1 = y * Math.sin(ax) + z * Math.cos(ax)
  const x2 = x * Math.cos(ay) + z1 * Math.sin(ay)
  const z2 = -x * Math.sin(ay) + z1 * Math.cos(ay)
  const x3 = x2 * Math.cos(az) - y1 * Math.sin(az)
  y1 = x2 * Math.sin(az) + y1 * Math.cos(az)
  return [x3, y1, z2]
}

export function startWireframeScene(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  let width = 0
  let height = 0
  let frame = 0
  let visible = true
  let pointer: [number, number] = [0, 0]

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2)
    width = canvas.clientWidth
    height = canvas.clientHeight
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function draw(time: number) {
    const t = time / 1000
    ctx!.clearRect(0, 0, width, height)
    const focal = Math.min(width, height) * 0.9
    // 指やマウスの位置で、少しだけ視点をずらす
    const [px, py] = pointer
    for (const body of BODIES) {
      const angle: Vec3 = [body.phase[0] + body.speed[0] * t, body.phase[1] + body.speed[1] * t, body.phase[2] + body.speed[2] * t]
      const float = Math.sin(t * 0.4 + body.phase[0]) * 0.15
      const projected = body.mesh.vertices.map(vertex => {
        const [x, y, z] = rotate(vertex, angle)
        const wx = x * body.scale + body.position[0] - px * 0.3
        const wy = y * body.scale + body.position[1] + float - py * 0.3
        const wz = z * body.scale + body.position[2]
        return [width / 2 + (wx / wz) * focal, height / 2 + (wy / wz) * focal, wz] as const
      })
      ctx!.strokeStyle = body.color
      ctx!.lineWidth = 1.5
      for (const [a, b] of body.mesh.edges) {
        const [x1, y1, z1] = projected[a]!
        const [x2, y2, z2] = projected[b]!
        // 奥にある線ほど薄くする
        ctx!.globalAlpha = Math.max(0.12, Math.min(0.75, 2.4 / ((z1 + z2) / 2)))
        ctx!.beginPath()
        ctx!.moveTo(x1, y1)
        ctx!.lineTo(x2, y2)
        ctx!.stroke()
      }
    }
    ctx!.globalAlpha = 1
  }

  function loop(time: number) {
    draw(time)
    if (visible) frame = requestAnimationFrame(loop)
  }

  const observer = new IntersectionObserver(([entry]) => {
    const next = entry?.isIntersecting ?? true
    if (next && !visible && !reducedMotion) frame = requestAnimationFrame(loop)
    visible = next
  })
  const onPointer = (event: PointerEvent) => {
    pointer = [(event.clientX / innerWidth - 0.5) * 2, (event.clientY / innerHeight - 0.5) * 2]
  }

  resize()
  addEventListener('resize', resize)
  observer.observe(canvas)
  if (reducedMotion) {
    draw(0)
  } else {
    addEventListener('pointermove', onPointer, { passive: true })
    frame = requestAnimationFrame(loop)
  }

  return () => {
    cancelAnimationFrame(frame)
    observer.disconnect()
    removeEventListener('resize', resize)
    removeEventListener('pointermove', onPointer)
  }
}
